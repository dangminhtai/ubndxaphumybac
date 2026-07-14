from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pdfplumber


CATALOG_CODE_PATTERN = re.compile(r"^CH\.(VT|TH|TC|PC|CC|KH)\.\d{2}$")
EXPECTED_GROUP_COUNTS = {
    "CH.VT": 6,
    "CH.TH": 53,
    "CH.TC": 7,
    "CH.PC": 6,
    "CH.CC": 3,
    "CH.KH": 5,
}
GROUP_NAMES = {
    "CH.VT": "Văn thư, lưu trữ",
    "CH.TH": "Công việc tổng hợp, hành chính",
    "CH.TC": "Nghiệp vụ tài chính - kế toán",
    "CH.PC": "Công tác xây dựng thể chế, pháp chế",
    "CH.CC": "Nhóm cải cách hành chính",
    "CH.KH": "Các nhiệm vụ khác",
}

# Text của dòng này nằm ngoài khung cột "Nhiệm vụ" trong PDF nên pdfplumber
# không gắn được vào cell. Nội dung được đối chiếu trực tiếp trên trang 6.
TASK_NAME_CORRECTIONS = {
    "CH.TC.06": "Thực hiện thủ tục liên quan đến việc mua sắm của cơ quan, đơn vị bằng hình thức mời thầu",
}


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value).strip()


def parse_number(value: str | None) -> int | float | None:
    normalized = clean_text(value).replace(" ", "").replace(",", ".")
    if not normalized or normalized == "-":
        return None
    number = float(normalized)
    return int(number) if number.is_integer() else number


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def extract_catalog(pdf_path: Path) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            table = page.extract_table(
                {
                    "text_x_tolerance": 1,
                    "text_y_tolerance": 3,
                }
            )
            if not table:
                raise ValueError(f"Không trích xuất được bảng ở trang {page_number}")

            for row in table[1:]:
                if not row or len(row) < 9:
                    continue

                code = clean_text(row[1])
                if not CATALOG_CODE_PATTERN.fullmatch(code):
                    continue

                group = ".".join(code.split(".")[:2])
                task_name = clean_text(row[2]) or TASK_NAME_CORRECTIONS.get(code, "")
                items.append(
                    {
                        "order": int(clean_text(row[0])),
                        "code": code,
                        "group": group,
                        "groupName": GROUP_NAMES[group],
                        "taskName": task_name,
                        "outputProduct": clean_text(row[3]),
                        "classification": parse_number(row[4]),
                        "maxScoreFrame": parse_number(row[5]),
                        "score": parse_number(row[6]),
                        "conversionFactor": parse_number(row[7]),
                        "description": clean_text(row[8]),
                        "sourcePage": page_number,
                    }
                )

    return items


def validate_catalog(items: list[dict[str, Any]]) -> dict[str, Any]:
    errors: list[str] = []
    codes = [item["code"] for item in items]
    group_counts = Counter(item["group"] for item in items)

    if len(items) != 80:
        errors.append(f"Cần đúng 80 mục, hiện có {len(items)}")

    duplicate_codes = sorted(code for code, count in Counter(codes).items() if count > 1)
    if duplicate_codes:
        errors.append(f"Mã trùng: {', '.join(duplicate_codes)}")

    for item in items:
        if not CATALOG_CODE_PATTERN.fullmatch(item["code"]):
            errors.append(f"Mã sai định dạng: {item['code']}")
        if not item["taskName"]:
            errors.append(f"Thiếu tên nhiệm vụ: {item['code']}")
        if not item["outputProduct"]:
            errors.append(f"Thiếu sản phẩm đầu ra: {item['code']}")

    for group, expected_count in EXPECTED_GROUP_COUNTS.items():
        actual_count = group_counts.get(group, 0)
        if actual_count != expected_count:
            errors.append(f"Nhóm {group}: cần {expected_count}, hiện có {actual_count}")

    unexpected_groups = sorted(set(group_counts) - set(EXPECTED_GROUP_COUNTS))
    if unexpected_groups:
        errors.append(f"Nhóm không hợp lệ: {', '.join(unexpected_groups)}")

    if errors:
        raise ValueError("Dữ liệu danh mục không hợp lệ:\n- " + "\n- ".join(errors))

    return {
        "total": len(items),
        "groupCounts": dict(sorted(group_counts.items())),
        "uniqueCodes": len(set(codes)),
    }


def markdown_number(value: int | float | None) -> str:
    if value is None:
        return "Không quy định"
    return str(value).replace(".", ",")


def build_markdown(items: list[dict[str, Any]], source_name: str, source_hash: str) -> str:
    lines = [
        "# Danh mục sản phẩm, công việc chung",
        "",
        f"- Nguồn: `{source_name}`",
        "- Phiên bản nội dung: 05/2026",
        f"- SHA-256 nguồn: `{source_hash}`",
        f"- Tổng số mã: {len(items)}",
        "",
        "> File này được sinh từ PDF và dùng để đối chiếu dữ liệu. Mọi thay đổi cần chạy lại validator trước khi đưa vào hệ thống.",
        "",
    ]

    current_group = ""
    for item in items:
        if item["group"] != current_group:
            current_group = item["group"]
            lines.extend(
                [
                    f"# {current_group} - {item['groupName']}",
                    "",
                ]
            )

        lines.extend(
            [
                f"## {item['code']}",
                "",
                f"- Số thứ tự: {item['order']}",
                f"- Nhóm: {item['group']}",
                f"- Nhiệm vụ: {item['taskName']}",
                f"- Sản phẩm đầu ra: {item['outputProduct']}",
                f"- Phân nhóm: {markdown_number(item['classification'])}",
                f"- Khung điểm tối đa: {markdown_number(item['maxScoreFrame'])}",
                f"- Chấm điểm: {markdown_number(item['score'])}",
                f"- Hệ số quy đổi: {markdown_number(item['conversionFactor'])}",
                f"- Trang nguồn: {item['sourcePage']}",
                "",
                "### Diễn giải",
                "",
                item["description"] or "Không có diễn giải riêng trong tài liệu nguồn.",
                "",
            ]
        )

    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    project_dir = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="Chuyển danh mục công việc từ PDF sang Markdown và JSON")
    parser.add_argument(
        "--pdf",
        type=Path,
        default=project_dir / "1. Danh muc chung .pdf",
        help="Đường dẫn PDF nguồn",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=project_dir / "data" / "document-catalog",
        help="Thư mục đầu ra",
    )
    args = parser.parse_args()

    pdf_path = args.pdf.resolve()
    output_dir = args.output_dir.resolve()
    if not pdf_path.is_file():
        raise FileNotFoundError(f"Không tìm thấy PDF: {pdf_path}")

    items = extract_catalog(pdf_path)
    validation = validate_catalog(items)
    source_hash = sha256_file(pdf_path)
    generated_at = datetime.now(timezone.utc).isoformat()

    output_dir.mkdir(parents=True, exist_ok=True)
    catalog_payload = {
        "schemaVersion": 1,
        "catalogVersion": "2026-05",
        "sourceFile": pdf_path.name,
        "sourceSha256": source_hash,
        "items": items,
    }
    manifest = {
        "schemaVersion": 1,
        "catalogVersion": "2026-05",
        "generatedAt": generated_at,
        "sourceFile": pdf_path.name,
        "sourceSha256": source_hash,
        **validation,
    }

    (output_dir / "danh-muc-chung.json").write_text(
        json.dumps(catalog_payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (output_dir / "danh-muc-chung.md").write_text(
        build_markdown(items, pdf_path.name, source_hash),
        encoding="utf-8",
    )

    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
