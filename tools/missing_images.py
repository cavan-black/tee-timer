"""List the clubs with no course photo, ready for hand-supplied URLs.

Paste the tenant key and an image URL into OVERRIDES in
tools/harvest_images.py, then re-run it (or apply directly to
assets/course_images.json) and restart the API so it reloads the manifest.

    python -m tools.missing_images
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from teetimer.courses import COURSES  # noqa: E402
from teetimer.sites import SITES  # noqa: E402

have = json.loads((ROOT / "assets" / "course_images.json").read_text(encoding="utf-8"))

clubs: dict[str, tuple[str, str]] = {}
for c in COURSES:
    clubs.setdefault(c.tenant, (c.club, c.area))

missing = [(t, *clubs[t]) for t in sorted(clubs) if t not in have]
missing.sort(key=lambda row: (row[2], row[1]))

print(f"{len(missing)} of {len(clubs)} clubs have no course photo\n")
print(f"{'KEY':<16} {'CLUB':<30} {'AREA':<28} SITE")
print("-" * 110)
for key, club, area in missing:
    print(f"{key:<16} {club:<30} {area:<28} {SITES.get(key, '-')}")

print("\nPaste into OVERRIDES in tools/harvest_images.py, e.g.")
if missing:
    print(f'    "{missing[0][0]}": "https://example.com/your-photo.jpg",')
print("\nLandscape, at least 800px wide, and a photo of the course itself.")
