"""Import a course photo from a local file.

For the clubs whose sites refuse us — TLS-level blocks, bot-challenge pages, or
JavaScript galleries — the photo has to come from a file instead. This
normalises whatever you hand it (webp, png, screenshot) into the same format as
the rest: JPEG, at most 1280px wide.

    python -m tools.import_image valderrama "C:\\path\\to\\photo.webp"
    python -m tools.import_image --list        # keys still without a photo
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from teetimer.courses import COURSES  # noqa: E402

OUT = ROOT / "assets" / "courses"
MAX_W = 1280
QUALITY = 82


def import_one(key: str, path: Path) -> str:
    known = {c.tenant for c in COURSES}
    if key not in known:
        return f"unknown club key {key!r}"
    if not path.is_file():
        return f"no such file: {path}"

    img = Image.open(path).convert("RGB")
    before = f"{img.width}x{img.height}"
    if img.width > MAX_W:
        img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / f"{key}.jpg"
    img.save(dest, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    return (f"{key}: {before} -> {img.width}x{img.height}, "
            f"{dest.stat().st_size // 1024} KB  ({path.suffix.lstrip('.')})")


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--list" in args or not args:
        have = {p.stem for p in OUT.glob("*.jpg")} if OUT.exists() else set()
        clubs = {c.tenant: c.club for c in COURSES}
        missing = sorted(set(clubs) - have)
        print(f"{len(missing)} clubs without a photo:")
        for k in missing:
            print(f"   {k:<16} {clubs[k]}")
        sys.exit(0)

    if len(args) % 2:
        sys.exit("usage: python -m tools.import_image <key> <file> [<key> <file> ...]")
    for key, raw in zip(args[::2], args[1::2]):
        print("  " + import_one(key, Path(raw)))
