"""Presentation layer: a responsive, animated results list.

Streamlit's built-in dataframe is a spreadsheet -- it scrolls horizontally on a
phone and can't be styled. These helpers render the same rows as semantic HTML
that reflows into cards on narrow screens.
"""
from __future__ import annotations

from html import escape

import pandas as pd

# Colours are expressed as translucent greys plus two accents so the sheet
# reads correctly against either Streamlit theme without recolouring.
CSS = """
<style>
:root{
  --tt-surface: rgba(128,128,128,.07);
  --tt-surface-hi: rgba(128,128,128,.15);
  --tt-line: rgba(128,128,128,.20);
  --tt-accent: #0f9d58;
  --tt-deal: #e8590c;
  --tt-radius: 12px;
}

/* ---- summary tiles ---------------------------------------------------- */
.tt-stats{
  display:grid; gap:.6rem; margin:.2rem 0 1.1rem;
  grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
}
.tt-stat{
  background:var(--tt-surface); border:1px solid var(--tt-line);
  border-radius:var(--tt-radius); padding:.7rem .9rem;
  animation:tt-in .45s cubic-bezier(.2,.7,.3,1) both;
}
.tt-stat b{ display:block; font-size:1.5rem; line-height:1.25; font-variant-numeric:tabular-nums; }
.tt-stat span{ font-size:.72rem; letter-spacing:.07em; text-transform:uppercase; opacity:.6; }

/* ---- results list ----------------------------------------------------- */
.tt-list{ display:flex; flex-direction:column; gap:.4rem; }
.tt-head{
  display:grid; grid-template-columns:74px minmax(0,1fr) 130px 92px;
  gap:.75rem; padding:0 .9rem .35rem; font-size:.7rem; letter-spacing:.07em;
  text-transform:uppercase; opacity:.55;
}
.tt-head i{ font-style:normal; }
.tt-head i:nth-child(3){ text-align:right; }
.tt-head i:nth-child(4){ text-align:right; }

.tt-row{
  display:grid; grid-template-columns:74px minmax(0,1fr) 130px 92px;
  gap:.75rem; align-items:center;
  padding:.62rem .9rem;
  background:var(--tt-surface); border:1px solid transparent;
  border-radius:var(--tt-radius);
  animation:tt-in .4s cubic-bezier(.2,.7,.3,1) both;
  animation-delay:var(--d,0s);
  transition:background .18s ease, border-color .18s ease, transform .18s ease;
}
.tt-row:hover{
  background:var(--tt-surface-hi); border-color:var(--tt-line);
  transform:translateY(-1px);
}
.tt-time{ font-size:1.05rem; font-weight:650; font-variant-numeric:tabular-nums; }
.tt-club{
  font-weight:600; line-height:1.3;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.tt-course{ opacity:.65; font-weight:400; }
.tt-meta{
  display:flex; flex-wrap:wrap; gap:.3rem .45rem;
  margin-top:.2rem; font-size:.76rem; opacity:.72; align-items:center;
}
.tt-chip{
  border:1px solid var(--tt-line); border-radius:999px;
  padding:.02rem .45rem; font-size:.7rem; white-space:nowrap;
}
.tt-rate{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%; }

.tt-price{ text-align:right; line-height:1.25; }
.tt-eur{
  font-size:1.12rem; font-weight:700; color:var(--tt-accent);
  font-variant-numeric:tabular-nums; display:block;
}
.tt-sub{ font-size:.72rem; opacity:.65; }
.tt-was{ text-decoration:line-through; }
.tt-off{ color:var(--tt-deal); font-weight:600; }

/* Streamlit styles bare anchors blue-and-underlined, hence !important. */
a.tt-book, a.tt-book:visited{
  display:block; text-align:center; text-decoration:none !important;
  border:1px solid var(--tt-line); border-radius:8px;
  padding:.34rem .5rem; font-size:.82rem; font-weight:600;
  color:inherit !important;
  transition:background .18s ease, border-color .18s ease, color .18s ease;
}
a.tt-book:hover{
  background:var(--tt-accent); border-color:var(--tt-accent); color:#fff !important;
}

@keyframes tt-in{ from{ opacity:0; transform:translateY(7px);} to{ opacity:1; transform:none;} }

/* ---- phones ----------------------------------------------------------- */
@media (max-width: 720px){
  .tt-head{ display:none; }
  .tt-row{
    grid-template-columns:auto 1fr;
    grid-template-areas:"time price" "main main" "book book";
    row-gap:.5rem; padding:.75rem .85rem;
  }
  .tt-time{ grid-area:time; font-size:1.2rem; }
  .tt-price{ grid-area:price; }
  .tt-main{ grid-area:main; }
  .tt-club{ white-space:normal; }
  .tt-book{ grid-area:book; padding:.5rem; }
  .tt-row:hover{ transform:none; }
  .tt-stat b{ font-size:1.25rem; }
  section.main .block-container{ padding-left:.8rem; padding-right:.8rem; }
}

@media (prefers-reduced-motion: reduce){
  .tt-row, .tt-stat{ animation:none; }
  .tt-row{ transition:none; }
}
</style>
"""


_DARK = "<style>:root{ --tt-accent:#4ade80; --tt-deal:#ffa94d; }</style>"


def css(dark: bool = False) -> str:
    """Stylesheet for the results list. Streamlit's theme is independent of the
    OS setting, so the dark accents are switched in explicitly rather than with
    a prefers-color-scheme query."""
    return CSS + (_DARK if dark else "")


def stats(items: list[tuple[str, str]]) -> str:
    tiles = "".join(
        f'<div class="tt-stat" style="animation-delay:{i * .05:.2f}s">'
        f"<span>{escape(label)}</span><b>{escape(value)}</b></div>"
        for i, (label, value) in enumerate(items)
    )
    return f'<div class="tt-stats">{tiles}</div>'


def _row(rec: dict, delay: float) -> str:
    course = rec["Course"]
    title = escape(str(rec["Club"]))
    if course and course != "—":
        title += f' <span class="tt-course">· {escape(str(course))}</span>'

    chips = [escape(str(rec["Area"])), f'{rec["Holes"]}h']
    if rec.get("Includes"):
        chips.append(escape(str(rec["Includes"])))
    chips.append(f'{rec["Spaces"]} space' + ("s" if rec["Spaces"] != 1 else ""))
    chip_html = "".join(f'<span class="tt-chip">{c}</span>' for c in chips)

    # `Was`/`Off` arrive as NaN when the engine quotes no rack price -- and NaN
    # is truthy, so it has to be tested explicitly.
    was, off = rec.get("Was €"), rec.get("Off %")
    sub = ""
    if pd.notna(was) and pd.notna(off) and was > rec["Price €"]:
        sub = (f'<span class="tt-sub"><span class="tt-was">€{was:,.0f}</span> '
               f'<span class="tt-off">−{off:.0f}%</span></span>')

    return (
        f'<div class="tt-row" style="--d:{delay:.2f}s">'
        f'<div class="tt-time">{escape(str(rec["Time"]))}</div>'
        f'<div class="tt-main"><div class="tt-club">{title}</div>'
        f'<div class="tt-meta">{chip_html}'
        f'<span class="tt-rate">{escape(str(rec["Rate"]))}</span></div></div>'
        f'<div class="tt-price"><span class="tt-eur">€{rec["Price €"]:,.2f}</span>{sub}</div>'
        f'<a class="tt-book" href="{escape(str(rec["Book"]), quote=True)}" '
        f'target="_blank" rel="noopener">Book ↗</a>'
        "</div>"
    )


def rows(frame: pd.DataFrame, limit: int = 100) -> str:
    """Render up to `limit` rows; animation delays are capped so a long list
    doesn't take seconds to finish appearing."""
    head = ("<div class='tt-head'><i>Tee</i><i>Course</i>"
            "<i>Price</i><i>Book</i></div>")
    body = "".join(
        _row(rec, min(i, 18) * 0.025)
        for i, rec in enumerate(frame.head(limit).to_dict("records"))
    )
    return f"{head}<div class='tt-list'>{body}</div>"
