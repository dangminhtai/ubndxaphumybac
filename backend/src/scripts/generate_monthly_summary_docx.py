import html
import json
import shutil
import sys
import zipfile
import xml.etree.ElementTree as ET
from datetime import date, datetime
from pathlib import Path

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
XML_SPACE = "http://www.w3.org/XML/1998/namespace"


def esc(value):
    return html.escape(str(value or ""), quote=False)


def read_payload():
    raw = sys.stdin.buffer.read().decode("utf-8-sig")
    if not raw.strip():
        raise ValueError("Thiếu payload JSON")
    return json.loads(raw)


def required(payload, key):
    value = payload.get(key)
    if value is None or value == "":
        raise ValueError(f"Thiếu dữ liệu bắt buộc: {key}")
    return value


def format_place_date(today=None):
    if not today:
        today = date.today()
    return f"Phù Mỹ Bắc, ngày {today.day} tháng {today.month} năm {today.year}"


def markdown_to_html(text):
    import re
    text = re.sub(r'\*\*\*(.*?)\*\*\*', r'<b><i>\1</i></b>', text)
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
    return text

def parse_html_to_lines(html_text):
    import re
    # Convert <br> and <br/> to newline
    text = re.sub(r'<br\s*/?>', '\n', html_text)
    # Convert closing block tags to newlines
    text = re.sub(r'</(p|div|li|h1|h2|h3|h4|h5|h6)>', '\n', text)
    # Remove opening block tags
    text = re.sub(r'<(p|div|li|ul|ol|h1|h2|h3|h4|h5|h6)[^>]*>', '', text)
    
    raw_lines = text.splitlines()
    lines = []
    for line in raw_lines:
        line_clean = line.strip()
        if line_clean:
            lines.append(line_clean)
    return lines

def parse_runs(text):
    import re
    import html
    pattern = re.compile(r'(<[a-zA-Z/]+[^>]*>)')
    parts = pattern.split(text)
    runs = []
    bold = False
    italic = False
    underline = False
    for part in parts:
        if not part:
            continue
        if part.startswith("<") and part.endswith(">"):
            tag = part.lower()
            if tag in ["<b>", "<strong>"]:
                bold = True
            elif tag in ["</b>", "</strong>"]:
                bold = False
            elif tag in ["<i>", "<i>", "<em>"]:
                italic = True
            elif tag in ["</i>", "</i>", "</em>"]:
                italic = False
            elif tag == "<u>":
                underline = True
            elif tag == "</u>":
                underline = False
        else:
            clean_text = html.unescape(part)
            if clean_text:
                runs.append((clean_text, bold, italic, underline))
    return runs

def paragraph_runs(runs, *, align=None, size=28, spacing_after=120, default_bold=False, default_italic=False):
    justify = f'<w:jc w:val="{align}"/>' if align else ""
    runs_xml = []
    for text, bold, italic, underline in runs:
        b_tag = "<w:b/>" if (bold or default_bold) else ""
        i_tag = "<w:i/>" if (italic or default_italic) else ""
        u_tag = '<w:u w:val="single"/>' if underline else ""
        runs_xml.append(f"""
      <w:r>
        <w:rPr>
          {b_tag}
          {i_tag}
          {u_tag}
          <w:sz w:val="{size}"/>
          <w:szCs w:val="{size}"/>
        </w:rPr>
        <w:t xml:space="preserve">{esc(text)}</w:t>
      </w:r>
        """)
    return f"""
    <w:p>
      <w:pPr>
        {justify}
        <w:spacing w:after="{spacing_after}"/>
      </w:pPr>
      {"".join(runs_xml)}
    </w:p>
    """

def paragraph(text="", *, bold=False, align=None, size=28, spacing_after=120, italic=False):
    html_text = markdown_to_html(text)
    runs = parse_runs(html_text)
    return paragraph_runs(runs, align=align, size=size, spacing_after=spacing_after, default_bold=bold, default_italic=italic)


def section_heading(text):
    return paragraph(text, bold=True, size=28, spacing_after=100)


def bullet(text):
    cleaned = text.strip()
    if not cleaned:
        return ""
    if cleaned.startswith("-"):
        cleaned = cleaned[1:].strip()
    runs = parse_runs(cleaned)
    if runs:
        runs[0] = (f"- {runs[0][0]}", runs[0][1], runs[0][2], runs[0][3])
    return paragraph_runs(runs, size=28, spacing_after=80)


def multiline_block(text):
    html_text = markdown_to_html(str(text or ""))
    lines = parse_html_to_lines(html_text)
    if not lines:
        return ""
    output = []
    for line in lines:
        if line.startswith("-"):
            output.append(bullet(line))
        else:
            runs = parse_runs(line)
            output.append(paragraph_runs(runs, size=28, spacing_after=120))
    return "".join(output)


def get_section_properties(template_path):
    with zipfile.ZipFile(template_path, "r") as zf:
        root = ET.fromstring(zf.read("word/document.xml"))
    ns = {"w": W_NS}
    body = root.find("w:body", ns)
    if body is None:
        return ""
    sect = body.find("w:sectPr", ns)
    if sect is None:
        return ""
    return ET.tostring(sect, encoding="unicode")


def build_document_xml(payload, template_path):
    period = required(payload, "period")
    report_title = required(payload, "reportTitle")
    department = required(payload, "department")
    content = required(payload, "content")
    difficulties = payload.get("difficulties") or ""
    proposals = payload.get("proposals") or ""
    next_tasks = payload.get("nextTasks") or ""

    sect_pr = get_section_properties(template_path)

    body = []
    body.append(paragraph("UBND XÃ PHÙ MỸ BẮC", bold=True, align="center", size=26, spacing_after=0))
    body.append(paragraph(department.upper(), bold=True, align="center", size=24, spacing_after=0))
    body.append(paragraph("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold=True, align="center", size=26, spacing_after=0))
    body.append(paragraph("Độc lập - Tự do - Hạnh phúc", bold=True, align="center", size=26, spacing_after=240))
    body.append(paragraph(format_place_date(), align="right", size=26, italic=True, spacing_after=240))
    body.append(paragraph(report_title, bold=True, align="center", size=32, spacing_after=240))

    body.append(section_heading(f"I. TÌNH HÌNH HOẠT ĐỘNG {period.upper()}"))
    body.append(multiline_block(content))

    body.append(section_heading("II. KHÓ KHĂN, VƯỚNG MẮC"))
    body.append(multiline_block(difficulties))

    body.append(section_heading("III. ĐỀ XUẤT, KIẾN NGHỊ"))
    body.append(multiline_block(proposals))

    body.append(section_heading("IV. PHƯƠNG HƯỚNG, NHIỆM VỤ TỚI"))
    body.append(multiline_block(next_tasks))

    body.append(paragraph("Kính báo cáo lãnh đạo Phòng biết và chỉ đạo.", size=28, spacing_after=320))
    body.append(paragraph("Trưởng phòng", bold=True, align="right", size=28, spacing_after=360))

    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="{W_NS}" xmlns:xml="{XML_SPACE}">
  <w:body>
    {''.join(body)}
    {sect_pr}
  </w:body>
</w:document>
"""


def main():
    if len(sys.argv) != 3:
        print("Usage: generate_monthly_summary_docx.py <template.docx> <output.docx>", file=sys.stderr)
        return 2

    template_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    payload = read_payload()

    if not template_path.exists():
        print(f"Template not found: {template_path}", file=sys.stderr)
        return 1

    output_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(template_path, output_path)

    document_xml = build_document_xml(payload, template_path)
    temp_path = output_path.with_suffix(".tmp.docx")

    with zipfile.ZipFile(output_path, "r") as zin, zipfile.ZipFile(temp_path, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            if item.filename == "word/document.xml":
                zout.writestr(item, document_xml.encode("utf-8"))
            else:
                zout.writestr(item, zin.read(item.filename))

    temp_path.replace(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
