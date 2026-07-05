import html
import json
import shutil
import sys
import zipfile
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta
from pathlib import Path

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
XML_SPACE = "http://www.w3.org/XML/1998/namespace"


def esc(value):
    return html.escape(str(value or ""), quote=False)


def read_payload():
    raw = sys.stdin.buffer.read().decode("utf-8-sig")
    return json.loads(raw or "{}")


def parse_iso(value):
    if not value:
        return None
    return datetime.strptime(value[:10], "%Y-%m-%d").date()


def format_slash(value):
    return f"{value.day}/{value.month}/{value.year}"


def format_place_date(value):
    return f"Phù Mỹ Bắc, ngày {value.day} tháng {value.month} năm {value.year}"


def week_label_from_thursday(thursday):
    week_no = ((thursday.day - 1) // 7) + 1
    return f"Tuần {week_no:02d} tháng {thursday.month} năm {thursday.year}"


def activity_label(period):
    return period.replace(" năm ", " tháng_năm_marker ").split(" tháng_năm_marker ")[0]


def week_label_no_year(date_obj):
    week_no = ((date_obj.day - 1) // 7) + 1
    return f"Tuần {week_no:02d} tháng {date_obj.month}"


def default_window():
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    thursday = monday + timedelta(days=3)
    return monday, thursday


def paragraph(text="", *, bold=False, align=None, size=28, spacing_after=120, italic=False):
    justify = f'<w:jc w:val="{align}"/>' if align else ""
    bold_tag = "<w:b/>" if bold else ""
    italic_tag = "<w:i/>" if italic else ""
    return f"""
    <w:p>
      <w:pPr>
        {justify}
        <w:spacing w:after="{spacing_after}"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          {bold_tag}
          {italic_tag}
          <w:sz w:val="{size}"/>
          <w:szCs w:val="{size}"/>
        </w:rPr>
        <w:t xml:space="preserve">{esc(text)}</w:t>
      </w:r>
    </w:p>
    """


def section_heading(text):
    return paragraph(text, bold=True, size=28, spacing_after=100)


def bullet(text):
    cleaned = text.strip()
    if not cleaned:
        return ""
    if cleaned.startswith("-"):
        cleaned = cleaned[1:].strip()
    return paragraph(f"- {cleaned}", size=28, spacing_after=80)


def multiline_block(text):
    lines = [line.strip() for line in str(text or "").splitlines() if line.strip()]
    if not lines:
        return paragraph("Không có nội dung.", size=28)
    if len(lines) == 1:
        return paragraph(lines[0], size=28)
    return "".join(bullet(line) for line in lines)


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
    monday, thursday = default_window()
    start_date = parse_iso(payload.get("startDate")) or monday
    end_date = parse_iso(payload.get("endDate")) or thursday
    due_date = parse_iso(payload.get("dueDate")) or end_date

    period = payload.get("period") or week_label_from_thursday(end_date)
    next_period = payload.get("nextPeriod") or week_label_from_thursday(end_date + timedelta(days=7))
    report_title = payload.get("reportTitle") or f"BÁO CÁO CÔNG TÁC {period.upper()}"
    date_range = f"(Từ ngày {format_slash(start_date)} đến ngày {format_slash(end_date)})"

    field = payload.get("field") or "Lĩnh vực"
    sender = payload.get("sender") or "Người báo cáo"
    department = payload.get("department") or "UBND Cấp Xã"
    content = payload.get("content") or ""
    administrative_reform = payload.get("administrativeReform") or ""
    digital_transformation = payload.get("digitalTransformation") or ""
    next_tasks = payload.get("nextTasks") or ""
    difficulties = payload.get("difficulties") or ""
    submission_date = date.today()

    sect_pr = get_section_properties(template_path)

    body = []
    body.append(paragraph(department.upper(), bold=True, align="center", size=26, spacing_after=0))
    if field.strip():
        body.append(paragraph(field.upper(), bold=True, align="center", size=24, spacing_after=0))
    body.append(paragraph("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold=True, align="center", size=26, spacing_after=0))
    body.append(paragraph("Độc lập - Tự do - Hạnh phúc", bold=True, align="center", size=26, spacing_after=240))
    body.append(paragraph(format_place_date(submission_date), align="right", size=26, italic=True, spacing_after=240))
    body.append(paragraph(report_title, bold=True, align="center", size=32, spacing_after=60))
    body.append(paragraph(date_range, bold=True, align="center", size=26, spacing_after=240))

    strict_activity_period = week_label_no_year(end_date)
    body.append(section_heading(f"I. TÌNH HÌNH HOẠT ĐỘNG {strict_activity_period.upper()}"))
    body.append(multiline_block(content))

    body.append(section_heading(f"II. PHƯƠNG HƯỚNG, NHIỆM VỤ {next_period.upper()}"))
    body.append(multiline_block(next_tasks))

    if difficulties.strip():
        body.append(section_heading("III. TỒN TẠI, HẠN CHẾ"))
        body.append(multiline_block(difficulties))

    if proposals.strip():
        body.append(section_heading("IV. KIẾN NGHỊ ĐỀ XUẤT"))
        body.append(multiline_block(proposals))

    body.append(paragraph(
        f"Trên đây là báo cáo tình hình hoạt động lĩnh vực {field} được thực hiện vào {strict_activity_period.lower()} và Phương hướng hoạt động {next_period.lower()} của chuyên viên phụ trách.",
        size=28,
    ))
    body.append(paragraph("Kính báo cáo lãnh đạo Phòng biết và chỉ đạo.", size=28, spacing_after=320))
    body.append(paragraph("Người báo cáo", bold=True, align="right", size=28, spacing_after=360))
    body.append(paragraph(sender, bold=True, align="right", size=28, spacing_after=0))

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
        print("Usage: generate_weekly_docx.py <template.docx> <output.docx>", file=sys.stderr)
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
