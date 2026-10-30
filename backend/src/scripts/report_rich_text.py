"""Read the report editor's restricted HTML without applying Markdown regexes.

Lists use real Word numbering, with a separate sequence for each HTML list.
Only text and the supported inline marks reach the document.
"""
from html.parser import HTMLParser
from xml.sax.saxutils import escape
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'


class ReportHTML(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.blocks, self.runs, self.lists, self.sequences = [], [], [], []
        self.marks = {'strong': 0, 'em': 0, 'u': 0}
        self.pending_item = False
        self.skip = 0
        self.feed(text)
        self.flush()

    def flush(self, empty=False):
        if self.runs or empty:
            listing = self.lists[-1] if self.lists and self.pending_item else None
            self.blocks.append((self.runs, listing, len(self.lists)))
            self.runs = []
            self.pending_item = False

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'iframe'):
            self.skip += 1
        if self.skip:
            return
        if tag in self.marks:
            self.marks[tag] += 1
        elif tag in ('ul', 'ol'):
            self.flush()
            raw = dict(attrs).get('start', '1')
            start = int(raw) if raw.isdigit() and 1 <= int(raw) <= 9999 else 1
            sequence = (len(self.sequences), tag, start)
            self.sequences.append(sequence)
            self.lists.append(sequence)
        elif tag == 'li':
            self.flush()
            self.pending_item = True
        elif tag == 'p':
            self.flush()
        elif tag == 'br':
            self.runs.append(('\n', False, False, False))

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'iframe') and self.skip:
            self.skip -= 1
            return
        if self.skip:
            return
        if tag in self.marks:
            self.marks[tag] = max(0, self.marks[tag] - 1)
        elif tag in ('p', 'li', 'ul', 'ol'):
            self.flush(empty=tag == 'p' and not self.runs)
            if tag in ('ul', 'ol') and self.lists:
                self.lists.pop()

    def handle_data(self, text):
        if not self.skip and (text.strip() or self.runs):
            self.runs.append((text, bool(self.marks['strong']), bool(self.marks['em']), bool(self.marks['u'])))


def numbering_xml(abstract_id, num_id, kind, start):
    fmt, label = ('decimal', '%1.') if kind == 'ol' else ('bullet', '•')
    return (f'<w:abstractNum w:abstractNumId="{abstract_id}"><w:multiLevelType w:val="singleLevel"/>'
            f'<w:lvl w:ilvl="0"><w:start w:val="{start}"/><w:numFmt w:val="{fmt}"/>'
            f'<w:lvlText w:val="{label}"/><w:lvlJc w:val="left"/>'
            '<w:pPr><w:tabs><w:tab w:val="num" w:pos="720"/></w:tabs>'
            '<w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>'
            f'<w:num w:numId="{num_id}"><w:abstractNumId w:val="{abstract_id}"/></w:num>')


def add_html(doc, text, paragraph):
    parsed = ReportHTML(text)
    numbering = doc.part.numbering_part.element
    next_abstract = max([int(n.get(qn('w:abstractNumId'))) for n in numbering.findall(qn('w:abstractNum'))] + [0]) + 1
    next_num = max([int(n.get(qn('w:numId'))) for n in numbering.findall(qn('w:num'))] + [0]) + 1
    from lxml import etree
    for index, kind, start in parsed.sequences:
        root = etree.fromstring(f'<w:numbering xmlns:w="{W}">{numbering_xml(next_abstract + index, next_num + index, kind, start)}</w:numbering>')
        for child in root:
            if child.tag == qn('w:abstractNum'):
                numbering.insert(0, child)
            else:
                numbering.append(child)
    for runs, listing, depth in parsed.blocks:
        p = paragraph(doc, '', indent=not bool(depth))
        if depth:
            p.paragraph_format.left_indent = Pt(36 * min(depth, 3))
            p.paragraph_format.first_line_indent = Pt(-18 if listing else 0)
        if listing:
            num_pr = p._p.get_or_add_pPr().get_or_add_numPr()
            for tag, val in [('ilvl', 0), ('numId', next_num + listing[0])]:
                node = OxmlElement(f'w:{tag}')
                node.set(qn('w:val'), str(val))
                num_pr.append(node)
        for text, bold, italic, underline in runs:
            run = p.add_run(text)
            run.bold, run.italic, run.underline = bold, italic, underline
            run.font.name, run.font.size = 'Times New Roman', Pt(14)


# XML-template generators use the same block parser and deterministic, isolated IDs.
XML_NUMBERING = []


def html_word_xml(text):
    parsed = ReportHTML(text)
    base = 9000 + len(XML_NUMBERING)
    for index, kind, start in parsed.sequences:
        XML_NUMBERING.append(numbering_xml(base + index, base + index, kind, start))
    result = []
    for runs, listing, depth in parsed.blocks:
        num = f'<w:numPr><w:ilvl w:val="0"/><w:numId w:val="{base + listing[0]}"/></w:numPr>' if listing else ''
        indent = f'<w:ind w:left="{720 * min(depth, 3)}" w:hanging="{360 if listing else 0}"/>' if depth else ''
        parts = []
        for value, bold, italic, underline in runs:
            marks = ('<w:b/>' if bold else '') + ('<w:i/>' if italic else '') + ('<w:u w:val="single"/>' if underline else '')
            content = '<w:br/>'.join(f'<w:t xml:space="preserve">{escape(line)}</w:t>' for line in value.split('\n'))
            parts.append(f'<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="28"/>{marks}</w:rPr>{content}</w:r>')
        result.append(f'<w:p><w:pPr>{num}<w:spacing w:after="120"/>{indent}</w:pPr>{"".join(parts)}</w:p>')
    return ''.join(result)


def merge_numbering(original):
    from lxml import etree
    root = etree.fromstring(original)
    extra = etree.fromstring(f'<w:numbering xmlns:w="{W}">{"".join(XML_NUMBERING)}</w:numbering>')
    for node in extra:
        if node.tag == qn('w:abstractNum'):
            root.insert(0, node)
        else:
            root.append(node)
    return etree.tostring(root, xml_declaration=True, encoding='UTF-8', standalone=True)
