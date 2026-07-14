from __future__ import annotations

import argparse
import json
import math
import os
import re
import time
import unicodedata
from pathlib import Path
from typing import Any

os.environ.setdefault("USE_TF", "0")
os.environ.setdefault("USE_TORCH", "1")

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def remove_accents(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value.replace("đ", "d").replace("Đ", "D"))
    return "".join(char for char in decomposed if unicodedata.category(char) != "Mn")


def normalize_text(value: str) -> str:
    value = remove_accents(unicodedata.normalize("NFC", value)).lower()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def normalize_code(value: str) -> str:
    compact = re.sub(r"[^A-Za-z0-9]", "", value).upper()
    match = re.fullmatch(r"CH(VT|TH|TC|PC|CC|KH)(\d{2})", compact)
    return f"CH.{match.group(1)}.{match.group(2)}" if match else ""


def item_text(item: dict[str, Any]) -> str:
    return " | ".join(
        part
        for part in [
            item["code"],
            item["groupName"],
            item["taskName"],
            item["outputProduct"],
            item["description"],
        ]
        if part
    )


def rank_from_scores(items: list[dict[str, Any]], scores: np.ndarray) -> list[str]:
    order = np.argsort(-scores, kind="stable")
    return [items[index]["code"] for index in order]


def rank_lexical(
    items: list[dict[str, Any]],
    queries: list[str],
) -> tuple[list[list[str]], float]:
    documents = [normalize_text(item_text(item)) for item in items]
    normalized_queries = [normalize_text(query) for query in queries]

    word_vectorizer = TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)
    char_vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True)
    word_documents = word_vectorizer.fit_transform(documents)
    char_documents = char_vectorizer.fit_transform(documents)

    started = time.perf_counter()
    word_queries = word_vectorizer.transform(normalized_queries)
    char_queries = char_vectorizer.transform(normalized_queries)
    word_scores = cosine_similarity(word_queries, word_documents)
    char_scores = cosine_similarity(char_queries, char_documents)
    combined_scores = 0.72 * word_scores + 0.28 * char_scores

    for query_index, query in enumerate(queries):
        exact_code = normalize_code(query)
        if exact_code:
            for item_index, item in enumerate(items):
                if item["code"] == exact_code:
                    combined_scores[query_index, item_index] += 10

    elapsed_ms = (time.perf_counter() - started) * 1000
    rankings = [rank_from_scores(items, scores) for scores in combined_scores]
    return rankings, elapsed_ms


def rank_semantic(
    items: list[dict[str, Any]],
    queries: list[str],
    model_name: str,
    offline: bool,
) -> tuple[list[list[str]], float, float]:
    load_started = time.perf_counter()
    model = SentenceTransformer(model_name, local_files_only=offline)
    load_ms = (time.perf_counter() - load_started) * 1000

    passages = [f"passage: {item_text(item)}" for item in items]
    document_embeddings = model.encode(
        passages,
        batch_size=16,
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    started = time.perf_counter()
    query_embeddings = model.encode(
        [f"query: {query}" for query in queries],
        batch_size=16,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    scores = np.matmul(query_embeddings, document_embeddings.T)
    elapsed_ms = (time.perf_counter() - started) * 1000
    rankings = [rank_from_scores(items, query_scores) for query_scores in scores]
    return rankings, load_ms, elapsed_ms


def reciprocal_rank_fusion(rankings: list[list[list[str]]], k: int = 60) -> list[list[str]]:
    fused: list[list[str]] = []
    query_count = len(rankings[0])
    for query_index in range(query_count):
        scores: dict[str, float] = {}
        for system_rankings in rankings:
            for rank, code in enumerate(system_rankings[query_index], start=1):
                scores[code] = scores.get(code, 0.0) + 1.0 / (k + rank)
        fused.append(sorted(scores, key=lambda code: (-scores[code], code)))
    return fused


def precision_at_k(ranking: list[str], relevance: dict[str, int], k: int) -> float:
    return sum(1 for code in ranking[:k] if relevance.get(code, 0) > 0) / k


def reciprocal_rank_at_k(ranking: list[str], relevance: dict[str, int], k: int) -> float:
    for rank, code in enumerate(ranking[:k], start=1):
        if relevance.get(code, 0) > 0:
            return 1.0 / rank
    return 0.0


def dcg(grades: list[int]) -> float:
    return sum((2**grade - 1) / math.log2(rank + 1) for rank, grade in enumerate(grades, start=1))


def ndcg_at_k(ranking: list[str], relevance: dict[str, int], k: int) -> float:
    actual = [relevance.get(code, 0) for code in ranking[:k]]
    ideal = sorted(relevance.values(), reverse=True)[:k]
    ideal_dcg = dcg(ideal)
    return dcg(actual) / ideal_dcg if ideal_dcg else 0.0


def evaluate_system(
    system_name: str,
    rankings: list[list[str]],
    query_entries: list[dict[str, Any]],
    k: int,
) -> dict[str, Any]:
    details = []
    for entry, ranking in zip(query_entries, rankings, strict=True):
        relevance = entry["relevance"]
        relevant_ranks = {
            code: ranking.index(code) + 1 if code in ranking[:k] else None
            for code in relevance
        }
        details.append(
            {
                "id": entry["id"],
                "query": entry["query"],
                "precisionAt10": precision_at_k(ranking, relevance, k),
                "mrrAt10": reciprocal_rank_at_k(ranking, relevance, k),
                "ndcgAt10": ndcg_at_k(ranking, relevance, k),
                "top10": ranking[:k],
                "relevantRanks": relevant_ranks,
            }
        )

    return {
        "system": system_name,
        "queryCount": len(details),
        "precisionAt10": float(np.mean([detail["precisionAt10"] for detail in details])),
        "mrrAt10": float(np.mean([detail["mrrAt10"] for detail in details])),
        "ndcgAt10": float(np.mean([detail["ndcgAt10"] for detail in details])),
        "details": details,
    }


def build_markdown_report(payload: dict[str, Any]) -> str:
    lines = [
        "# Đánh giá tra cứu danh mục công việc",
        "",
        f"- Trạng thái qrels: **{payload['qrelsStatus']}**",
        f"- Số truy vấn: {payload['queryCount']}",
        f"- Số tài liệu: {payload['documentCount']}",
        f"- K: {payload['k']}",
        f"- Model semantic: `{payload['semanticModel']}`",
        "",
        "> Đây là baseline kỹ thuật. Nhãn relevance cần cán bộ nghiệp vụ duyệt trước khi dùng làm kết quả UAT.",
        "",
        "## Kết quả tổng hợp",
        "",
        "| Hệ tìm kiếm | P@10 | MRR@10 | NDCG@10 |",
        "| --- | ---: | ---: | ---: |",
    ]

    for result in payload["results"]:
        lines.append(
            f"| {result['system']} | {result['precisionAt10']:.4f} | {result['mrrAt10']:.4f} | {result['ndcgAt10']:.4f} |"
        )

    lines.extend(
        [
            "",
            "P@10 có giá trị tuyệt đối thấp khi mỗi truy vấn chỉ có 1-2 mã liên quan: nếu một mã đúng nằm trong Top 10 thì P@10 chỉ là 0,1. Vì vậy cần đọc cùng MRR@10 và NDCG@10.",
            "",
            "## Thời gian đo",
            "",
            f"- Nạp model semantic: {payload['timingMs']['semanticModelLoad']:.2f} ms.",
            f"- Lexical cho toàn bộ truy vấn: {payload['timingMs']['lexicalQueries']:.2f} ms.",
            f"- Semantic encode toàn bộ truy vấn: {payload['timingMs']['semanticQueries']:.2f} ms.",
            "",
            "Thời gian trên là phép đo máy phát triển, không thay thế benchmark môi trường Render/QA.",
            "",
            "## Chi tiết thứ hạng mã liên quan",
            "",
            "| ID | Truy vấn | Lexical | Semantic | Hybrid |",
            "| --- | --- | --- | --- | --- |",
        ]
    )

    detail_maps = {
        result["system"]: {detail["id"]: detail for detail in result["details"]}
        for result in payload["results"]
    }
    for query in payload["queries"]:
        cells = []
        for system in ["lexical", "semantic", "hybrid_rrf"]:
            ranks = detail_maps[system][query["id"]]["relevantRanks"]
            cells.append(", ".join(f"{code}: {rank or '>10'}" for code, rank in ranks.items()))
        safe_query = query["query"].replace("|", "\\|")
        lines.append(f"| {query['id']} | {safe_query} | {cells[0]} | {cells[1]} | {cells[2]} |")

    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    project_dir = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="Đánh giá lexical, semantic và hybrid cho danh mục")
    parser.add_argument(
        "--catalog",
        type=Path,
        default=project_dir / "data" / "document-catalog" / "danh-muc-chung.json",
    )
    parser.add_argument(
        "--queries",
        type=Path,
        default=project_dir / "data" / "document-catalog" / "evaluation-queries.json",
    )
    parser.add_argument("--model", default="intfloat/multilingual-e5-small")
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--k", type=int, default=10)
    args = parser.parse_args()

    catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
    qrels = json.loads(args.queries.read_text(encoding="utf-8"))
    items = catalog["items"]
    query_entries = qrels["queries"]
    queries = [entry["query"] for entry in query_entries]

    lexical_rankings, lexical_ms = rank_lexical(items, queries)
    semantic_rankings, model_load_ms, semantic_ms = rank_semantic(
        items,
        queries,
        args.model,
        args.offline,
    )
    hybrid_rankings = reciprocal_rank_fusion([lexical_rankings, semantic_rankings])

    results = [
        evaluate_system("lexical", lexical_rankings, query_entries, args.k),
        evaluate_system("semantic", semantic_rankings, query_entries, args.k),
        evaluate_system("hybrid_rrf", hybrid_rankings, query_entries, args.k),
    ]
    payload = {
        "schemaVersion": 1,
        "catalogVersion": catalog["catalogVersion"],
        "qrelsStatus": qrels["status"],
        "queryCount": len(query_entries),
        "documentCount": len(items),
        "k": args.k,
        "semanticModel": args.model,
        "timingMs": {
            "semanticModelLoad": model_load_ms,
            "lexicalQueries": lexical_ms,
            "semanticQueries": semantic_ms,
        },
        "results": results,
        "queries": query_entries,
    }

    results_path = project_dir / "data" / "document-catalog" / "evaluation-results.json"
    report_path = project_dir.parent / "docs" / "document_catalog_retrieval_evaluation.md"
    results_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    report_path.write_text(build_markdown_report(payload), encoding="utf-8")

    print(json.dumps({
        "qrelsStatus": payload["qrelsStatus"],
        "queryCount": payload["queryCount"],
        "documentCount": payload["documentCount"],
        "timingMs": payload["timingMs"],
        "metrics": [
            {
                "system": result["system"],
                "P@10": round(result["precisionAt10"], 4),
                "MRR@10": round(result["mrrAt10"], 4),
                "NDCG@10": round(result["ndcgAt10"], 4),
            }
            for result in results
        ],
        "report": str(report_path),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
