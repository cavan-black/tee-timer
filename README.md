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

There is no aggregator behind this. Two platforms cover almost the whole
corridor, plus one club that runs its own engine — the app talks to each
directly:

| Platform | Clubs | Endpoint |
| --- | --- | --- |
| **Golfmanager** | 13 | `GET https://<tenant>.golfmanager.com/ebookings/searchAvailability.api` |
| **TeeOne** | 21 | `POST https://api.teeone.golf/.../Api/Disponibilidad/ObtenerDisponibilidadDia` |
| **Río Real** | 1 | `GET https://reservas-golf.rioreal.com/reserva/fecha:YYYY-MM-DD` (server-rendered) |

These are the same calls the clubs' own booking widgets make, so prices are the
live online rate rather than a rack card. TeeOne needs a per-club token, which
the adapter lifts from the booking page once per session and caches.

```
teetimer/
  courses.py          registry of clubs -> platform + route ids
  models.py           Course / TeeTime / rate classification
  scraper.py          concurrent fan-out, per-course error isolation
  ui.py               responsive results list (CSS + HTML)
  adapters/
    golfmanager.py
    teeone.py
    rioreal.py
streamlit_app.py      the UI
tools/
  smoke.py            hit every course, report coverage
  discover.py         re-verify the registry against the live engines
  test_filters.py     rate-name -> hole-count classification tests
  test_render.py      results-list rendering checks
```

## Details worth knowing

- **Prices are per player.** Multi-player packages ("2 GF + buggy") are divided
  down so every row is comparable.
- **Holes are read from the rate, not the course.** An 18-hole tee sheet
  routinely sells 9-hole green fees; filtering on the course alone would leak
  them into an 18-hole search.
- **Junior / member / pro rates are hidden by default.** The engines list them
  but a visiting adult can't book them, and they otherwise dominate "cheapest".
- **A club that is closed, full or has no rate sheet published is reported as
  such**, not as an error. Genuine failures get their own expander.
- **Río Real sells time bands, not slots.** Its engine prices a window
  ("08:00–09:50 → €141") and settles the exact tee time at the next step, so its
  rows are timed at the band's opening and labelled `time band HH:MM–HH:MM`.
  Its sheet also doesn't publish per-band remaining capacity, so the player
  filter can't narrow it.
- Results are cached for 3 minutes so re-filtering doesn't re-hit every engine.

## Coverage

35 clubs / 57 bookable routes across Sotogrande & San Roque, Casares, Estepona,
Benahavís, San Pedro & Nueva Andalucía, Marbella and Mijas/Fuengirola, plus
Alhaurín and Lauro just inland (off by default).

Known gaps — these clubs are in the corridor but sell green fees through
channels with no open availability feed: Miraflores, La Dama de Noche,
Greenlife, Casares Costa, Monte Paraíso and Real Club de Golf Sotogrande.

Clubs change platform occasionally. Run `python -m tools.discover` to print what
each engine currently reports and reconcile it with `teetimer/courses.py`.
