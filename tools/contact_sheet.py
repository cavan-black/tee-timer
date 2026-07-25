"""Composite every harvested course image into montage PNGs for review.

Filename heuristics get you close but can't tell a fairway from a course map or
a clubhouse. This downloads each image and lays them out in labelled grids so
they can actually be looked at before trusting assets/course_images.json.

    python -m tools.contact_sheet     ->  assets/contact-sheet-N.png
"""
from __future__ import annotations

import io
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import json  # noqa: E402

from teetimer.courses import COURSES  # noqa: E402

IMAGES = json.loads((ROOT / "assets" / "course_images.json").read_text(encoding="utf-8"))
CLUB = {c.tenant: c.club for c in COURSES}
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126 Safari/537.36"}

COLS, ROWS = 3, 3          # 9 per sheet keeps each tile big enough to judge
TILE_W, TILE_H = 380, 214
LABEL_H = 26
BG = (11, 20, 16)
INK = (234, 242, 238)


def grab(item: tuple[str, str]) -> tuple[str, Image.Image | None]:
    tenant, url = item
    try:
        r = requests.get(url, headers=UA, timeout=40, verify=False)
        r.raise_for_status()
        img = Image.open(io.BytesIO(r.content)).convert("RGB")
        return tenant, img
    except Exception:
        return tenant, None


def cover(img: Image.Image, w: int, h: int) -> Image.Image:
    scale = max(w / img.width, h / img.height)
    img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))),
                     Image.LANCZOS)
    left, top = (img.width - w) // 2, (img.height - h) // 2
    return img.crop((left, top, left + w, top + h))


if __name__ == "__main__":
    requests.packages.urllib3.disable_warnings()
    items = sorted(IMAGES.items(), key=lambda kv: CLUB.get(kv[0], kv[0]))
    with ThreadPoolExecutor(max_workers=10) as pool:
        fetched = list(pool.map(grab, items))

    per_sheet = COLS * ROWS
    sheets = [fetched[i:i + per_sheet] for i in range(0, len(fetched), per_sheet)]

    for n, sheet in enumerate(sheets, 1):
        canvas = Image.new("RGB", (COLS * TILE_W, ROWS * (TILE_H + LABEL_H)), BG)
        draw = ImageDraw.Draw(canvas)
        for i, (tenant, img) in enumerate(sheet):
            col, row = i % COLS, i // COLS
            x, y = col * TILE_W, row * (TILE_H + LABEL_H)
            if img is not None:
                canvas.paste(cover(img, TILE_W - 6, TILE_H - 6), (x + 3, y + 3))
            else:
                draw.rectangle([x + 3, y + 3, x + TILE_W - 3, y + TILE_H - 3],
                               fill=(40, 20, 20))
                draw.text((x + 14, y + TILE_H // 2), "FAILED TO LOAD", fill=(255, 140, 140))
            draw.text((x + 8, y + TILE_H + 6), CLUB.get(tenant, tenant)[:42], fill=INK)
        out = ROOT / "assets" / f"contact-sheet-{n}.png"
        canvas.save(out, "PNG", optimize=True)
        print(f"wrote {out.relative_to(ROOT)}  ({len(sheet)} images)")

    missing = sorted(set(CLUB) - set(IMAGES))
    print(f"\n{len(IMAGES)} with imagery, {len(missing)} without:")
    for t in missing:
        print(f"   {CLUB[t]}")
