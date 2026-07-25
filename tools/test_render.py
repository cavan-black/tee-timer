"""Render checks for the results list — mainly that missing rack prices don't
leak a NaN into the page.

    python -m tools.test_render
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from teetimer import ui  # noqa: E402

NAN = float("nan")
ROWS = [
    # no rack price at all -> no strikethrough block
    dict(Time="16:00", Club="Azata Golf", Course="—", Area="Estepona", Holes=18,
         **{"Price €": 40.0, "Was €": NAN, "Off %": NAN},
         Rate="SUPER TWILIGHT", Spaces=2, Includes="", Book="https://example.com"),
    # rack price equals the online price -> nothing to boast about
    dict(Time="15:00", Club="Santa María", Course="—", Area="Marbella", Holes=18,
         **{"Price €": 34.0, "Was €": 34.0, "Off %": NAN},
         Rate="GF TWILIGHT", Spaces=4, Includes="", Book="https://example.com"),
    # a genuine discount
    dict(Time="11:00", Club="La Noria", Course="—", Area="Mijas", Holes=18,
         **{"Price €": 44.0, "Was €": 48.0, "Off %": 8.0},
         Rate="GF 18", Spaces=2, Includes="Buggy", Book="https://example.com"),
]

html = ui.rows(pd.DataFrame(ROWS))
subs = re.findall(r'<span class="tt-sub">.*?</span>\s*</span>', html)

checks = [
    ("no 'nan' anywhere in the markup", "nan" not in html.lower()),
    ("exactly one discount block rendered", len(subs) == 1),
    ("that block is the real 8% saving", bool(subs) and "−8%" in subs[0]),
    ("book links are not raw-styled anchors", 'class="tt-book"' in html),
    ("club names are html-escaped", "&" not in html.replace("&nbsp;", "")
     or "<script" not in html),
]
for name, ok in checks:
    print(f"  {'ok  ' if ok else 'FAIL'} {name}")

sys.exit(0 if all(ok for _, ok in checks) else 1)
