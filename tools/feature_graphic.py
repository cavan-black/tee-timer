"""Build the 1024x500 feature graphic Google Play requires.

The photograph is a CC0 (public domain dedication) shot of the public beach at
Marbella, just south of the old town, from Wikimedia Commons. CC0 matters here:
a feature graphic is advertising, and the course photos the app displays are the
clubs' own -- fine to show alongside their prices, not ours to market with. CC0
also carries no attribution requirement, which a store graphic has nowhere to
put.

    python -m tools.feature_graphic      -> assets/store/feature-graphic.png
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
STORE = ROOT / "assets" / "store"
SOURCE = STORE / "marbella-source.jpg"
OUT = STORE / "feature-graphic.png"

W, H = 1024, 500

# The band with sea, beach, palms and the marina masts. Below this the frame is
# taken up by a dark timber pergola, which is where the original was shot from.
CROP = (840, 880, 2480, 1680)

INK = (7, 18, 13)            # theme bg
ACCENT = (74, 222, 128)      # theme accent, dark-mode value
WHITE = (255, 255, 255)

FONTS = Path("C:/Windows/Fonts")


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(str(FONTS / name), size)
    except OSError:
        return ImageFont.load_default()


def tracked(draw: ImageDraw.ImageDraw, xy, text: str, f, fill, spacing: float) -> None:
    """Draw with letter spacing; Pillow has no tracking of its own."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=f, fill=fill)
        x += draw.textlength(ch, font=f) + spacing


def ramp(width: int, height: int, peak: int, end: float) -> Image.Image:
    """A horizontal alpha ramp as an L-mode mask, `peak` at the left edge and
    nothing from `end` onwards.

    Smoothstep, not linear: against a near-flat sky a piecewise-linear ramp
    shows its corners as visible vertical bands.
    """
    row = Image.new("L", (width, 1))
    px = row.load()
    for x in range(width):
        p = min(1.0, (x / (width - 1)) / end)
        px[x, 0] = int(peak * (1 - (p * p * (3 - 2 * p))))
    return row.resize((width, height))


def build() -> Image.Image:
    photo = Image.open(SOURCE).convert("RGB").crop(CROP).resize((W, H), Image.LANCZOS)

    # The original is a hazy, blown-out afternoon. A light flat darkening tames
    # the sky without turning the coast grey -- the graphic is selling somewhere
    # sunny, so the right-hand side has to stay bright.
    base = Image.blend(photo, Image.new("RGB", (W, H), INK), 0.12)

    # Then a heavier wash on the left, where the wording goes. It has to survive
    # white surf and a white sky, so it runs almost solid at the edge.
    wash = Image.new("RGB", (W, H), INK)
    base.paste(wash, (0, 0), ramp(W, H, peak=245, end=0.70))

    img = base.convert("RGB")
    d = ImageDraw.Draw(img)

    x = 64
    tracked(d, (x, 132), "COSTA DEL SOL", font("segoeuib.ttf", 17), ACCENT, 3.4)

    title = font("segoeuib.ttf", 78)
    d.text((x - 4, 164), "Tee Timer", font=title, fill=WHITE)

    body = font("segoeui.ttf", 25)
    d.text((x, 272), "Live tee times and green fees from", font=body, fill=(233, 242, 236))
    d.text((x, 306), "38 clubs on the Costa del Sol", font=body, fill=(233, 242, 236))

    # A rule rather than a pill: the graphic is already busy on the right.
    d.rectangle([x, 366, x + 54, 370], fill=ACCENT)

    small = font("segoeui.ttf", 19)
    d.text((x, 392), "Sotogrande to Fuengirola", font=small, fill=(233, 242, 236, 200))

    return img


if __name__ == "__main__":
    STORE.mkdir(parents=True, exist_ok=True)
    out = build()
    out.save(OUT, "PNG")
    print(f"{OUT.relative_to(ROOT)}  {out.size[0]}x{out.size[1]}  "
          f"{OUT.stat().st_size / 1024:.0f} KB")
