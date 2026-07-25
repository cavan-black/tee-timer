"""Generate the home-screen icon.

iOS ignores the browser favicon when a site is saved to the home screen; it
looks for <link rel="apple-touch-icon"> and falls back to a screenshot of the
page if there isn't one. Apple wants a 180x180 PNG, opaque, with no rounded
corners or transparency of its own (iOS applies the mask).

    python -m tools.make_icon        # writes assets/icon-180.png
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "icon-180.png"

SIZE = 180
SS = 8  # supersample factor, then downscale for smooth edges
GREEN_DARK = (11, 74, 44)
GREEN = (22, 138, 78)
FLAG = (239, 68, 68)
WHITE = (255, 255, 255)
SHADOW = (0, 0, 0, 45)


def build() -> Image.Image:
    n = SIZE * SS
    img = Image.new("RGB", (n, n), GREEN_DARK)
    d = ImageDraw.Draw(img, "RGBA")

    # subtle fairway band across the lower half
    d.ellipse([-n * 0.35, n * 0.52, n * 1.35, n * 1.5], fill=GREEN)

    # hole + its shadow
    cx, cy = n * 0.60, n * 0.735
    d.ellipse([cx - n * 0.105, cy - n * 0.043, cx + n * 0.105, cy + n * 0.043],
              fill=GREEN_DARK)

    # flag pole
    px = n * 0.60
    d.rounded_rectangle([px - n * 0.016, n * 0.20, px + n * 0.016, cy],
                        radius=n * 0.016, fill=WHITE)

    # pennant
    d.polygon([(px - n * 0.022, n * 0.205), (px - n * 0.335, n * 0.315),
               (px - n * 0.022, n * 0.425)], fill=FLAG)

    # ball, with a soft contact shadow
    bx, by, r = n * 0.265, n * 0.775, n * 0.072
    d.ellipse([bx - r * 1.15, by + r * 0.55, bx + r * 1.15, by + r * 1.05], fill=SHADOW)
    d.ellipse([bx - r, by - r, bx + r, by + r], fill=WHITE)

    return img.resize((SIZE, SIZE), Image.LANCZOS)


# Native app icons come from the same drawing so the web app, the iOS
# home-screen shortcut and the store builds all look like one product.
MOBILE = ROOT / "mobile" / "assets"
NATIVE = [
    (MOBILE / "icon.png", 1024, False),
    (MOBILE / "favicon.png", 48, False),
    (MOBILE / "splash-icon.png", 512, True),
    (MOBILE / "android-icon-foreground.png", 432, True),
    (MOBILE / "android-icon-background.png", 432, False),
    (MOBILE / "android-icon-monochrome.png", 432, True),
]


def _at(size: int) -> Image.Image:
    global SIZE
    previous, SIZE = SIZE, size
    try:
        return build()
    finally:
        SIZE = previous


if __name__ == "__main__":
    OUT.parent.mkdir(parents=True, exist_ok=True)
    icon = _at(SIZE)
    icon.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT.relative_to(ROOT)}  {icon.size[0]}x{icon.size[1]}  "
          f"{OUT.stat().st_size:,} bytes")

    if MOBILE.exists():
        for path, size, inset in NATIVE:
            img = _at(size)
            if inset:
                # Android masks aggressively; keep the art inside the safe zone.
                pad = int(size * 0.18)
                canvas = Image.new("RGB", (size, size), GREEN_DARK)
                canvas.paste(img.resize((size - 2 * pad, size - 2 * pad), Image.LANCZOS),
                             (pad, pad))
                img = canvas
            img.save(path, "PNG", optimize=True)
            print(f"wrote {path.relative_to(ROOT)}  {size}x{size}")
    sys.exit(0)
