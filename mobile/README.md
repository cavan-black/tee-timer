# Tee Timer — mobile

Expo (React Native) app for iPhone and Android, on top of the same scrapers as
the Streamlit site.

## Run it on your phone

1. **Start the API** (from the repo root):

   ```bash
   python -m uvicorn api.index:app --host 0.0.0.0 --port 8000
   ```

   `0.0.0.0`, not `127.0.0.1` — your phone has to reach it across the network.

2. **Point the app at it.** Create `mobile/.env` with your machine's LAN IP
   (`ipconfig` → IPv4 Address). `localhost` is the phone itself, so it won't work:

   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.42:8000
   ```

   Once the API is on Vercel, use that URL instead and the app works anywhere.

3. **Start Expo and scan the QR code** with Expo Go (App Store / Play Store):

   ```bash
   cd mobile && npx expo start
   ```

## Architecture

The phone never scrapes. A whole-corridor search hits ~45 booking engines —
too slow and too battery-hungry for a device, and the engines would be
unreachable from an app anyway. The Python adapters run server-side and the app
reads JSON from `/api/search`.

```
app/
  _layout.tsx        dark stack navigator
  index.tsx          search + results (cards / table)
  course/[key].tsx   every tee time at one course
src/
  api.ts             typed client, 90s ceiling, AsyncStorage cache
  components.tsx     course art, chips, price, tee-time + table rows
  theme.ts           palette, type scale, spacing
```

### Two ways to read the results

**Cards** — one photo card per course, cheapest first, snap-scrolling so the
deck settles on a card rather than mid-photo. Tap through for that course's
full tee sheet.

**Table** — every tee time on the coast in one dense, time-ordered list:
tee, course, rate, max players, price. Tapping a row opens the club's booking
page directly. Use it when you know what you want and just need the cheapest
slot at 8am.

Toggle between them with the control above the results.

Notes:

- **Search is deliberately manual.** Changing a filter shows the cached result
  for it instantly but doesn't re-fetch; tapping *Find tee times* does. One
  search is real load on 45 clubs' booking systems.
- **The last result for each filter combination is cached**, so the app still
  shows something useful with no signal (flagged as an offline copy).
- **Course art**: 24 of 38 clubs publish a usable photo, referenced at runtime
  rather than bundled. The rest get deterministic generated artwork keyed off
  the club name, so every card still looks like a distinct place.
- **Booking happens on the club's own site.** Tapping a tee time opens it. The
  app never takes payment or holds a reservation.

## Store builds

Expo Go is enough to use the app. For real installable binaries you need EAS
(cloud macOS builders — you can't build iOS on Windows) plus your own Apple
Developer and Google Play accounts:

```bash
npm install -g eas-cli
eas login && eas build:configure
eas build --profile preview --platform android   # installable .apk
eas build --profile preview --platform ios       # needs Apple Developer
```

Regenerate the icons after editing the artwork:

```bash
python -m tools.make_icon      # from the repo root
```
