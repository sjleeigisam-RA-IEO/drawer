from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

import fitz


def floor_title(text: str, fallback: str) -> str:
    match = re.search(r"((?:B\d+|\d+|R)F)\s+FLOOR\s+PLAN", text, flags=re.I)
    return match.group(1).upper() if match else fallback


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract PDF vector pages into web-ready SVG files.")
    parser.add_argument("pdf", nargs="?", default=None)
    parser.add_argument("--out", default="generated/daechi2")
    args = parser.parse_args()

    if args.pdf:
        pdf_path = Path(args.pdf)
    else:
        sample_dir = Path("test sample")
        try:
            pdf_path = next(sample_dir.glob("*.pdf"))
        except StopIteration as exc:
            raise SystemExit(
                "PDF path is required unless a local 'test sample' folder exists."
            ) from exc

    if not pdf_path.exists():
        raise SystemExit(f"PDF not found: {pdf_path}")

    out_dir = Path(args.out)
    page_dir = out_dir / "pages"
    page_dir.mkdir(parents=True, exist_ok=True)

    source_bytes = pdf_path.read_bytes()
    source_hash = hashlib.sha256(source_bytes).hexdigest()
    doc = fitz.open(pdf_path)

    pages = []
    for index, page in enumerate(doc, start=1):
        text = page.get_text("text")
        title = floor_title(text, f"Page {index}")
        svg = page.get_svg_image(text_as_path=False)
        svg_name = f"page-{index:02d}.svg"
        svg_path = page_dir / svg_name
        svg_path.write_text(svg, encoding="utf-8")
        drawings = len(page.get_drawings())
        pages.append(
            {
                "index": index,
                "title": title,
                "drawingCount": drawings,
                "width": round(page.rect.width, 3),
                "height": round(page.rect.height, 3),
                "svg": f"pages/{svg_name}",
                "textPreview": " ".join(text.split())[:240],
            }
        )

    manifest = {
        "id": "daechi2-pdf-vector",
        "version": "ra-vector-drawing/v0.1",
        "sourceFile": pdf_path.name,
        "sourceHash": source_hash,
        "pageCount": len(pages),
        "units": "pdf-points",
        "pages": pages,
    }
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps({"out": str(out_dir), "pages": len(pages), "hash": source_hash}, ensure_ascii=False))


if __name__ == "__main__":
    main()
