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

There is no aggregator behind this. Two booking platforms cover the whole
corridor, and the app talks to each one's public endpoints directly:

| Platform | Clubs | Endpoint |
| --- | --- | --- |
| **Golfmanager** | 13 | `GET https://<tenant>.golfmanager.com/ebookings/searchAvailability.api` |
| **TeeOne** | 21 | `POST https://api.teeone.golf/.../Api/Disponibilidad/ObtenerDisponibilidadDia` |

Both are the same calls the clubs' own booking widgets make, so prices are the
live online rate rather than a rack card. TeeOne needs a per-club token, which
the adapter lifts from the booking page once per session and caches.

```
teetimer/
  courses.py          registry of clubs -> platform + route ids
  models.py           Course / TeeTime / rate classification
  scraper.py          concurrent fan-out, per-course error isolation
  adapters/
    golfmanager.py
    teeone.py
streamlit_app.py      the UI
tools/
  smoke.py            hit every course, report coverage
  discover.py         re-verify the registry against the live engines
  test_filters.py     rate-name -> hole-count classification tests
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
- Results are cached for 3 minutes so re-filtering doesn't re-hit 42 engines.

## Coverage

34 clubs / 56 bookable routes across Sotogrande & San Roque, Casares, Estepona,
Benahavís, San Pedro & Nueva Andalucía, Marbella and Mijas/Fuengirola, plus
Alhaurín and Lauro just inland (off by default).

Known gaps — these clubs are in the corridor but sell green fees through
channels with no open availability feed: Río Real (booking engine currently in
maintenance), Miraflores, La Dama de Noche, Greenlife, Casares Costa, Monte
Paraíso and Real Club de Golf Sotogrande.

Clubs change platform occasionally. Run `python -m tools.discover` to print what
each engine currently reports and reconcile it with `teetimer/courses.py`.
