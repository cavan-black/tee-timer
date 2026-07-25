# Tee Timer

Live tee times and green fees for every bookable golf course between Sotogrande
and Fuengirola, in one table. Pick a date and a time of day, hit search, and the
app queries each club's own booking engine in parallel.

## Running it

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

Deploy on Streamlit Community Cloud by pointing a new app at this repo with
`streamlit_app.py` as the entrypoint — no secrets or API keys are needed.

## How it works

There is no aggregator behind this. The corridor's clubs are spread across four
booking systems, and the app talks to each one directly:

| Platform | Clubs | Endpoint |
| --- | --- | --- |
| **Golfmanager (classic)** | 13 | `GET https://<tenant>.golfmanager.com/ebookings/searchAvailability.api` |
| **Golfmanager (hosted)** | 2 | `GET https://eu.golfmanager.com/<tenant>/consumer/availability.json` |
| **TeeOne** | 21 | `POST https://api.teeone.golf/.../Api/Disponibilidad/ObtenerDisponibilidadDia` |
| **Río Real** | 1 | `GET https://reservas-golf.rioreal.com/reserva/fecha:YYYY-MM-DD` |
| **MasterGolf** | 1 | `POST https://reservas72.miraflores-golf.com/.../selnav.php` |

These are the same calls the clubs' own pages make, so prices are the live
online rate rather than a rack card. Two need a handshake first: TeeOne mints a
per-club token on its booking page, and the hosted Golfmanager front-end embeds
a short-lived `rid` token that must be echoed back as a request header (without
it every call is a 401).

```
teetimer/
  courses.py          registry of clubs -> platform + route ids
  models.py           Course / TeeTime / rate classification
  scraper.py          concurrent fan-out, per-course error isolation
  ui.py               responsive results list (CSS + HTML)
  homescreen.py       iOS home-screen icon + web-app tags
  adapters/
    golfmanager.py    classic + hosted front-ends
    teeone.py
    rioreal.py
    mastergolf.py
streamlit_app.py      the UI
assets/icon-180.png   home-screen icon (regenerate: python -m tools.make_icon)
tools/
  smoke.py            hit every course, report coverage
  discover.py         re-verify the registry against the live engines
  make_icon.py        draw assets/icon-180.png
  test_filters.py     rate-name -> hole-count classification tests
  test_render.py      results-list rendering checks
  test_mastergolf.py  session/cap workaround checks for Miraflores
```

## Details worth knowing

- **Prices are per player.** Multi-player packages ("2 GF + buggy") are divided
  down so every row is comparable.
- **Holes are read from the rate, not the course.** An 18-hole tee sheet
  routinely sells 9-hole green fees; filtering on the course alone would leak
  them into an 18-hole search. Clock digits in a rate name are ignored so
  "time band 09:00–10:50" isn't mistaken for a 9-hole round.
- **Junior / member / pro rates are hidden by default.** The engines list them
  but a visiting adult can't book them, and they otherwise dominate "cheapest".
- **A club that is closed, full or has no rate sheet published is reported as
  such**, not as an error. Genuine failures get their own expander.
- **Río Real sells time bands, not slots.** Its engine prices a window
  ("08:00–09:50 → €141") and settles the exact tee time at the next step, so its
  rows are timed at the band's opening and labelled `time band HH:MM–HH:MM`.
  Its sheet doesn't publish per-band capacity, so the player filter can't
  narrow it.
- **Miraflores is the slow one.** Its PHP engine caches the first search per
  session and hard-caps results at 10 rows with no pager, so the adapter uses a
  throwaway session per query and slices the time window, splitting any slice
  that comes back capped. That costs a handful of requests instead of one and
  adds a few seconds to a whole-corridor search.
- **R.C.G. Sotogrande is members-only.** Its engine is live and answers
  correctly, but publishes no visitor green fees, so it always reports nothing
  available. It's registered so it appears the day that changes.
- Results are cached for 3 minutes so re-filtering doesn't re-hit every engine.

## Home-screen icon

Saved to an iPhone home screen, a Streamlit app shows a blank tile: iOS ignores
the tab favicon and wants `<link rel="apple-touch-icon">`, falling back to a
screenshot when it can't find one. `teetimer/homescreen.py` injects that tag
(plus the web-app title and status-bar style) into the parent document from a
components iframe, with the PNG inlined as a data URI. iOS caches the icon, so
an existing shortcut has to be deleted and re-added to pick it up.

## Coverage

38 clubs / 60 bookable routes across Sotogrande & San Roque, Casares, Estepona,
Benahavís, San Pedro & Nueva Andalucía, Marbella and Mijas/Fuengirola, plus
Alhaurín and Lauro just inland (off by default).

Known gaps — in the corridor but with no open availability feed: La Dama de
Noche, Casares Costa and Monte Paraíso.

Clubs change platform occasionally — Río Real left TeeOne, and Santa Clara
Marbella and Granada share a name but not a tenant. Run
`python -m tools.discover` to print what each engine currently reports and
reconcile it with `teetimer/courses.py`.
