"""Tee Timer — live green fees and tee times, Sotogrande to Fuengirola."""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta

import pandas as pd
import streamlit as st

from teetimer import AREAS, COURSES, scrape
from teetimer import homescreen, ui
from teetimer.courses import BY_KEY
from teetimer.models import rate_holes

st.set_page_config(page_title="Tee Timer — Costa del Sol", page_icon="⛳",
                   layout="wide", initial_sidebar_state="auto")

WINDOWS = {"Any time": "any", "Morning": "morning", "Afternoon": "afternoon"}
PAGE = 60

# Rates a visiting adult cannot actually book, but which the engines still list
# and which would otherwise dominate the "cheapest" column.
RESTRICTED = re.compile(
    r"\b(junior|jnr|infantil|cadete|under\s?1[0-8]|pga|profesional|professional"
    r"|federad[oa]|soci[oa]s?|member|abonad[oa]|residente|resident)\b",
    re.I,
)


def is_dark() -> bool:
    try:
        return st.context.theme.type == "dark"
    except Exception:  # older Streamlit versions have no theme context
        return st.get_option("theme.base") == "dark"


@st.cache_data(ttl=180, show_spinner=False)
def search(course_keys: tuple[str, ...], day: date, window: str, players: int):
    """Cached for 3 minutes so re-filtering doesn't re-hit every booking engine."""
    courses = [BY_KEY[k] for k in course_keys]
    return scrape(courses, day, window=window, players=players)


def to_frame(results, hide_restricted: bool, max_price: float | None,
             holes: str) -> pd.DataFrame:
    rows = []
    for result in results:
        for tee in result.tee_times:
            if hide_restricted and RESTRICTED.search(tee.rate_name):
                continue
            if max_price is not None and tee.price > max_price:
                continue
            # An 18-hole course sells 9-hole fees off the same tee sheet, so
            # the filter has to look at the rate, not just the course.
            played = rate_holes(tee.rate_name, tee.course.holes)
            if holes != "Both" and played != int(holes):
                continue
            rows.append({
                "Time": tee.tee_off.strftime("%H:%M"),
                "Club": tee.course.club,
                "Course": tee.course.course or "—",
                "Area": tee.course.area,
                "Holes": played,
                "Price €": tee.price,
                "Rate": tee.rate_name,
                "Was €": tee.rack_price,
                "Off %": tee.discount_pct or None,
                "Spaces": tee.players_available,
                "Includes": ", ".join(tee.includes),
                "Book": tee.booking_url,
                "_sort": tee.tee_off,
            })
    frame = pd.DataFrame(rows)
    return frame if frame.empty else frame.sort_values(["_sort", "Price €"]).drop(columns="_sort")


def show(frame: pd.DataFrame, key: str) -> None:
    """Render a result set with a 'show more' pager."""
    shown = st.session_state.setdefault(f"limit_{key}", PAGE)
    st.markdown(ui.rows(frame, shown), unsafe_allow_html=True)
    if len(frame) > shown:
        st.button(f"Show {min(PAGE, len(frame) - shown)} more "
                  f"({len(frame) - shown} left)", key=f"more_{key}",
                  use_container_width=True,
                  on_click=lambda: st.session_state.__setitem__(f"limit_{key}", shown + PAGE))


# --------------------------------------------------------------------------
# Sidebar
# --------------------------------------------------------------------------
with st.sidebar:
    st.header("Search")
    day = st.date_input("Date", value=date.today() + timedelta(days=1),
                        min_value=date.today(), max_value=date.today() + timedelta(days=180))
    window = WINDOWS[st.radio("Time of day", list(WINDOWS), horizontal=True)]
    players = st.slider("Players", 1, 4, 2)

    st.divider()
    holes = st.radio("Holes", ["18", "9", "Both"], horizontal=True, index=0)
    max_price = st.number_input("Max price per player (€)", 0, 1000, 0,
                                step=10, help="0 = no limit")
    hide_restricted = st.checkbox(
        "Hide junior / member / pro rates", value=True,
        help="These are listed by the booking engines but a visiting adult can't book them.")

    st.divider()
    areas = st.multiselect("Areas", AREAS, default=[a for a in AREAS if "Inland" not in a])
    include_inland = st.checkbox("Include inland courses (Alhaurín, Lauro)", value=False)

    pool = [
        c for c in COURSES
        if c.area in areas
        and (c.corridor or include_inland)
        # 9-hole routes can never yield an 18-hole round, but 18-hole tee
        # sheets do sell 9-hole fees -- so only "18" narrows the course pool.
        and (holes != "18" or c.holes == 18)
    ]
    with st.expander(f"Courses ({len(pool)} selected)"):
        chosen = st.multiselect("Courses", [c.label for c in pool],
                                default=[c.label for c in pool], label_visibility="collapsed")
        pool = [c for c in pool if c.label in chosen]

    go = st.button("Find tee times", type="primary", use_container_width=True,
                   disabled=not pool)

# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------
st.markdown(ui.css(is_dark()), unsafe_allow_html=True)
homescreen.apply("Tee Timer")

st.title("⛳ Tee Timer")
st.caption("Live availability and prices, straight from each club's own booking "
           "engine — Sotogrande to Fuengirola.")

if go:
    st.session_state["query"] = (tuple(c.key for c in pool), day, window, players)
    for k in list(st.session_state):
        if k.startswith("limit_"):
            st.session_state[k] = PAGE

query = st.session_state.get("query")
if not query:
    st.info(f"Set a date and time of day in the sidebar, then hit **Find tee times**. "
            f"{len(COURSES)} courses across {len(AREAS)} areas are covered.")
    st.stop()

keys, q_day, q_window, q_players = query
label = {"any": "any time", "morning": "the morning", "afternoon": "the afternoon"}[q_window]

with st.spinner(f"Checking {len(keys)} courses for {q_day:%a %d %b}…"):
    results = search(keys, q_day, q_window, q_players)

frame = to_frame(results, hide_restricted, max_price or None, holes)
available = [r for r in results if r.tee_times]
errors = [r for r in results if r.error]

st.subheader(f"{q_day:%A %d %B} — {label}, {q_players} player{'s' if q_players > 1 else ''}")

if frame.empty:
    st.warning("No tee times matched. Try a wider time window, more courses, or a higher price cap.")
else:
    best = (frame.sort_values("Price €")
                 .drop_duplicates(subset=["Club", "Course"])
                 .sort_values("Price €"))

    st.markdown(ui.stats([
        ("Tee times", f"{len(frame):,}"),
        ("Courses with space", f"{len(best)} / {len(results)}"),
        ("Cheapest", f"€{frame['Price €'].min():,.2f}"),
        ("Median", f"€{frame['Price €'].median():,.2f}"),
    ]), unsafe_allow_html=True)

    best_tab, all_tab, chart_tab = st.tabs(
        [f"Best per course ({len(best)})", f"All tee times ({len(frame)})", "Price by time"])

    with best_tab:
        show(best, "best")
    with all_tab:
        show(frame, "all")
    with chart_tab:
        chart = frame.copy()
        chart["Hour"] = chart["Time"].str.slice(0, 2).astype(int)
        st.scatter_chart(chart, x="Hour", y="Price €", color="Area", height=380,
                         use_container_width=True)

    st.download_button("Download CSV", frame.drop(columns=["Book"]).to_csv(index=False),
                       file_name=f"teetimes-{q_day}.csv", mime="text/csv")

if errors:
    with st.expander(f"⚠️ {len(errors)} course(s) could not be reached"):
        for r in errors:
            st.write(f"**{r.course.label}** — {r.error}")

quiet = [r for r in results if not r.tee_times and not r.error]
if quiet:
    with st.expander(f"{len(quiet)} course(s) with nothing available"):
        for r in quiet:
            st.write(f"**{r.course.label}** — {r.note or 'fully booked or closed'}")

st.caption(f"Fetched {datetime.now():%H:%M:%S}. Results cached 3 min. "
           "Prices are the club's own online rate per player; package rates are "
           "divided per player. Confirm on the club's site before travelling.")
