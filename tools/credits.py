"""Generate the image credits page.

Every course photograph in Tee Timer was published by the club itself, on its
own website, to advertise its own course. This page says so for each one, links
back to the club, and gives an unambiguous route to ask for a photo to be
removed.

Be clear about what this is: attribution is good practice and good faith, not a
licence. It does not convert unlicensed use into licensed use. What it does is
make the source honest and visible, make removal easy, and stop the app looking
like it is passing the clubs' photography off as its own.

    python -m tools.credits          -> web/credits.html
"""
from __future__ import annotations

import html
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from teetimer.courses import COURSES  # noqa: E402
from teetimer.sites import SITES  # noqa: E402
from tools.harvest_images import OVERRIDES  # noqa: E402

OUT = ROOT / "web" / "credits.html"
MANIFEST = ROOT / "assets" / "course_images.json"

# The live manifest points at our own /api/image/<key>; the URLs the photos came
# from were overwritten when we stopped hotlinking. They are still in git.
PRE_SELFHOST = "f076a51:assets/course_images.json"


def source_urls() -> dict[str, str]:
    urls: dict[str, str] = {}
    try:
        old = subprocess.run(
            ["git", "show", PRE_SELFHOST], cwd=ROOT,
            capture_output=True, text=True, check=True,
        ).stdout
        urls = {k: v for k, v in json.loads(old).items() if str(v).startswith("http")}
    except Exception:
        pass  # a shallow clone still produces a valid page, just less specific
    for key, value in OVERRIDES.items():
        if str(value).startswith("http"):
            urls.setdefault(key, value)
    return urls


def rows() -> list[tuple[str, str, str, str]]:
    """(club, area, source label, source href) for every club with a photo."""
    have = json.loads(MANIFEST.read_text(encoding="utf-8"))
    exact = source_urls()
    # COURSES is already ordered west to east, which is how the app presents the
    # coast; keep that rather than sorting alphabetically. A club can have
    # several routes, so dict insertion order does the de-duplication.
    clubs = {}
    for c in COURSES:
        clubs.setdefault(c.tenant, (c.club, c.area))

    out = []
    for tenant, (club, area) in clubs.items():
        if tenant not in have:
            continue
        url = exact.get(tenant) or SITES.get(tenant, "")
        if tenant in exact:
            label = "Published by the club"
        elif url:
            label = "From the club's website"
        else:
            label = "From the club"
        out.append((club, area, label, url))
    return out


PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tee Timer — Image Credits</title>
<style>
  :root {{ color-scheme: light dark; }}
  body {{
    margin: 0 auto; padding: 40px 22px 80px; max-width: 46rem;
    font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #07120D; color: #F2F7F4;
  }}
  @media (prefers-color-scheme: light) {{ body {{ background: #F4F7F4; color: #0B1A12; }} }}
  .kicker {{ font-size: 12px; letter-spacing: .12em; color: #4ADE80; margin: 0 0 6px; }}
  @media (prefers-color-scheme: light) {{ .kicker {{ color: #0F8A45; }} }}
  h1 {{ font-size: 30px; letter-spacing: -.02em; margin: 0 0 6px; }}
  h2 {{ font-size: 19px; margin: 36px 0 8px; }}
  .date {{ opacity: .55; font-size: 14px; margin: 0 0 28px; }}
  p, li, td {{ opacity: .85; }}
  a {{ color: inherit; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 15px; }}
  th {{ text-align: left; font-size: 12px; letter-spacing: .08em; opacity: .5;
       text-transform: uppercase; padding: 0 10px 8px 0; font-weight: 600; }}
  td {{ padding: 9px 10px 9px 0; border-top: 1px solid rgba(128,128,128,.22);
       vertical-align: top; }}
  .club {{ font-weight: 600; opacity: 1; }}
  .area {{ font-size: 13px; opacity: .55; }}
  .note {{ border-left: 3px solid #4ADE80; padding: 2px 0 2px 16px; margin: 26px 0; }}
  hr {{ border: 0; border-top: 1px solid rgba(128,128,128,.3); margin: 40px 0; }}
</style>
</head>
<body>

<p class="kicker">COSTA DEL SOL</p>
<h1>Tee Timer — Image Credits</h1>
<p class="date">Last updated {updated}</p>

<p>
  Tee Timer shows a photograph of each golf course alongside that course's
  prices. Those photographs are the clubs' own: each one was published by the
  club on its own website to advertise its own course, and the copyright in each
  remains with the club or its photographer. Tee Timer claims no ownership of
  any of them.
</p>

<div class="note">
  <p style="margin:0">
    <strong>If you are a club and would like your photograph removed</strong>,
    write to the support address on the app's Google Play listing and we will
    take it out of the next release — no explanation needed, no argument. The
    app falls back to a drawn illustration, so nothing breaks.
  </p>
</div>

<h2>Why the photographs are here</h2>
<p>
  A list of golf courses with no pictures is much harder to use, and a club's
  own promotional photograph is the picture that club has chosen to represent
  itself. The app sends every booking to the club's own site at the club's own
  price, takes no commission, and adds no booking fee, so a photograph here is
  doing the job the club published it to do. That is the reasoning; it is not a
  claim of any licence.
</p>

<h2>Course photographs</h2>
<p>
  {count} clubs, west to east along the coast. Where a photograph could not be
  matched to a specific page, the link goes to the club's own website, which is
  where it came from.
</p>

<table>
  <tr><th>Club</th><th>Source</th></tr>
{table}
</table>

<h2>Where a club has no photograph</h2>
<p>
  Any course without one is drawn instead — a generated illustration built from
  the club's name, so the same club always looks the same. Those illustrations
  are ours, and no photograph is involved.
</p>

<h2>Store and marketing artwork</h2>
<p>
  The graphic on the app's Google Play listing uses a photograph of the public
  beach at Marbella by <em>Ypsilon from Finland</em>, released into the public
  domain under
  <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0</a> and
  obtained from
  <a href="https://commons.wikimedia.org/wiki/File:Beach_in_Marbella.JPG">Wikimedia
  Commons</a>. No club photography is used to advertise the app.
</p>

<h2>App icon and illustrations</h2>
<p>
  The icon, the generated course illustrations and all interface artwork were
  made for Tee Timer and are its own.
</p>

<hr>

<p style="opacity:.5;font-size:14px">
  Tee Timer is an independent app. It is not affiliated with, endorsed by or
  operated by any of the clubs named on this page. Club names and logos are the
  property of their respective owners and are used only to identify the course a
  price belongs to.
</p>

</body>
</html>
"""


def build(updated: str) -> str:
    data = rows()
    lines = []
    for club, area, label, url in data:
        link = (f'<a href="{html.escape(url)}">{html.escape(label)}</a>'
                if url else html.escape(label))
        lines.append(
            "  <tr>"
            f'<td><span class="club">{html.escape(club)}</span><br>'
            f'<span class="area">{html.escape(area)}</span></td>'
            f"<td>{link}</td></tr>"
        )
    return PAGE.format(updated=updated, count=len(data), table="\n".join(lines))


if __name__ == "__main__":
    stamp = sys.argv[1] if len(sys.argv) > 1 else "28 July 2026"
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(build(stamp), encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)}  {len(rows())} clubs credited")
