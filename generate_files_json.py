"""
Generate files.json — an index of everything under ./data for the JunaidHub UI.

Output structure:
{
    "generated_at": "2026-05-21T10:00:00",
    "root": "data",
    "total_folders": N,
    "total_files": M,
    "total_size": <bytes>,
    "total_size_human": "12.4 MB",
    "folders": [
        {
            "folder": "<folder name>",
            "file_count": K,
            "total_size": <bytes>,
            "total_size_human": "...",
            "latest": "<ISO timestamp of newest file>",
            "files": [
                {
                    "name": "<filename>",
                    "type": "<extension lowercase>",
                    "url": "data/<folder>/<file>",
                    "size": <bytes>,
                    "size_human": "...",
                    "updated": "<ISO timestamp>"
                },
                ...
            ]
        },
        ...
    ]
}

Usage:
    python generate_files_json.py
"""

from __future__ import annotations
import json
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
OUTPUT_FILE = ROOT / "files.json"

# Files we don't want surfaced in the UI
IGNORE_NAMES = {".DS_Store", "Thumbs.db", "desktop.ini"}
IGNORE_PREFIXES = (".", "~$")


def human_size(num_bytes: int) -> str:
    """Convert byte count to a friendly string like '12.4 MB'."""
    if num_bytes < 1024:
        return f"{num_bytes} B"
    for unit in ("KB", "MB", "GB", "TB"):
        num_bytes /= 1024
        if num_bytes < 1024:
            return f"{num_bytes:.1f} {unit}"
    return f"{num_bytes:.1f} PB"


def should_skip(path: Path) -> bool:
    """Return True if this file/dir should not appear in the index."""
    name = path.name
    if name in IGNORE_NAMES:
        return True
    if any(name.startswith(p) for p in IGNORE_PREFIXES):
        return True
    return False


def collect_files(folder: Path) -> list[dict]:
    """Collect all (non-skipped) files in *folder* (non-recursive)."""
    files: list[dict] = []
    for entry in folder.iterdir():
        if not entry.is_file() or should_skip(entry):
            continue
        try:
            stat = entry.stat()
        except OSError as e:
            print(f"  ! skipping {entry.name}: {e}", file=sys.stderr)
            continue
        ext = entry.suffix.lstrip(".").lower() or "file"
        # Use forward slashes for web-safe URLs
        rel = entry.relative_to(ROOT).as_posix()
        files.append({
            "name": entry.name,
            "type": ext,
            "url": rel,
            "size": stat.st_size,
            "size_human": human_size(stat.st_size),
            "updated": datetime.fromtimestamp(stat.st_mtime).isoformat(timespec="seconds"),
        })
    files.sort(key=lambda f: f["updated"], reverse=True)
    return files


def build_index() -> dict:
    if not DATA_DIR.is_dir():
        raise SystemExit(f"data directory not found: {DATA_DIR}")

    folders_out: list[dict] = []
    total_files = 0
    total_size = 0

    for entry in sorted(DATA_DIR.iterdir(), key=lambda p: p.name.lower()):
        if not entry.is_dir() or should_skip(entry):
            continue
        files = collect_files(entry)
        if not files:
            continue
        folder_size = sum(f["size"] for f in files)
        latest = files[0]["updated"] if files else None
        folders_out.append({
            "folder": entry.name,
            "file_count": len(files),
            "total_size": folder_size,
            "total_size_human": human_size(folder_size),
            "latest": latest,
            "files": files,
        })
        total_files += len(files)
        total_size += folder_size

    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "root": DATA_DIR.name,
        "total_folders": len(folders_out),
        "total_files": total_files,
        "total_size": total_size,
        "total_size_human": human_size(total_size),
        "folders": folders_out,
    }


def main() -> None:
    index = build_index()
    OUTPUT_FILE.write_text(
        json.dumps(index, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"files.json written: {OUTPUT_FILE}")
    print(
        f"  {index['total_folders']} folders, "
        f"{index['total_files']} files, "
        f"{index['total_size_human']} total"
    )


if __name__ == "__main__":
    main()
