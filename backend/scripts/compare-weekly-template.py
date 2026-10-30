"""Export the reference PDF's body through our generator for manual layout QA.

Writes only local QA artifacts; does not read or modify application data.
Requires PyMuPDF and a working PDF converter (Word on Windows or LibreOffice).
"""
import json
import re
import sys
import tempfile
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend/src/scripts'))
import generate_weekly_summary_docx as generator


def main():
    output = Path(tempfile.gettempdir()) / 'weekly-template-comparison'
    output.mkdir(exist_ok=True)
    config = json.loads((ROOT / 'backend/src/config/document-defaults.json').read_text(encoding='utf-8'))
    groups, entries = [], []
    section = None
    current = None
    with pymupdf.open(ROOT / 'docs/template/Bao cao tuan 43, phuong huong tuan 44.pdf') as reference:
        for page in reference:
            blocks_with_lines = page.get_text('dict')['blocks']
            for block in page.get_text('blocks'):
                text = ' '.join(block[4].split())
                if block[1] < 45 or re.fullmatch(r'[\d\s]+', text):
                    continue
                if text.startswith('I. KẾT QUẢ'):
                    section = 'results'
                    continue
                if text.startswith('II. PHƯƠNG HƯỚNG'):
                    section = 'nextTasks'
                    continue
                if text.startswith('Trên đây là báo cáo'):
                    section = None
                if not section:
                    continue
                match = re.match(r'([1-8])\. (.+)', text)
                if match:
                    index, title = int(match[1]), match[2]
                    if section == 'results':
                        groups.append({'id': str(index), 'title': 'Y tế' if index == 4 else title})
                    current = {'id': f'{section}-{index}', 'groupId': str(index), 'section': section, 'text': ''}
                    entries.append(current)
                else:
                    # A paragraph continued across a page starts at the left margin.
                    first_line_x = next(b['lines'][0]['bbox'][0] for b in blocks_with_lines
                                        if 'lines' in b and abs(b['bbox'][1] - block[1]) < 0.1)
                    separator = ' ' if first_line_x < 90 and block[1] < 65 else '\n'
                    current['text'] += (separator if current['text'] else '') + text
        assert len(groups) == 8 and len(entries) == 16
        payload = dict(config=config, groups=groups, entries=entries,
                       startDate='2026-10-18T17:00:00Z', dueDate='2026-10-22T16:59:59Z')
        source, target = output / 'comparison.docx', output / 'comparison.pdf'
        generator.build_document(payload, source)
        generator.convert_pdf(source, target)
        with pymupdf.open(target) as actual:
            text = ' '.join(' '.join(block[4].split()) for page in actual
                            for block in page.get_text('blocks') if block[1] >= 45)
            for entry in entries:
                assert ''.join(entry['text'].split()) in ''.join(text.split()), entry['id']
            assert text.count('4. Y tế') == 2
            assert '4. Y tế và an toàn thực phẩm' not in text
            # Same content, same converter/font: check important first-page anchors.
            for prefix in ['BÁO CÁO', 'Kính gửi:', 'I. KẾT QUẢ', '1. Lĩnh vực', '2. Giáo dục', '3. Bảo trợ']:
                def anchor(doc):
                    return next(line['bbox'][1] for block in doc[0].get_text('dict')['blocks']
                                if 'lines' in block for line in block['lines']
                                if ''.join(span['text'] for span in line['spans']).startswith(prefix))
                assert abs(anchor(reference) - anchor(actual)) < 1, prefix
            for label, doc in [('reference', reference), ('actual', actual)]:
                for index in [0, len(doc) - 1]:
                    doc[index].get_pixmap().save(str(output / f'{label}-{index + 1}.png'))
            print(f'PASS: all 16 reference sections preserved. Pages: reference={len(reference)}, actual={len(actual)}. Artifacts: {output}')


if __name__ == '__main__':
    main()
