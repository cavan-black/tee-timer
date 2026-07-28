# Releasing Tee Timer on Google Play

A paid app: one price, no advertising, no in-app purchases, no accounts. That
decision removes most of the usual release plumbing — there is no AdMob SDK, no
consent flow, no advertising ID to declare, and no billing library. What remains
is below.

Suggested price: **€3.99**. The audience is about to spend €90 on a green fee
and €1,800 on the trip; the extra euro over €2.99 costs almost no conversion.

---

## What only you can do

These need your card, your identity or your Google account, so they can't be
scripted.

1. **Google Play Console account** — one-off $25, at
   <https://play.google.com/console>. Identity verification takes a day or two,
   so start it first.
2. **Expo account** — free, at <https://expo.dev>. Then `npx eas login`.
3. **Payments profile** in Play Console. A paid app cannot be published without
   one, and it takes longer to approve than people expect. Do it early.

Note that a paid app on Play is **permanently paid** — an app published with a
price can never be switched to free later. (Free-to-paid is also blocked.) If
there is any chance you want a free tier, decide before the first publish.

## Build it

```bash
cd mobile
npx eas login
npx eas build:configure          # links the project, writes the EAS project ID
npx eas build --platform android --profile preview      # APK, sideload to test
npx eas build --platform android --profile production   # AAB, upload to Play
```

`preview` gives an APK you can install on your own phone to check the real
build behaves like Expo Go did. `production` gives the `.aab` Play wants.

EAS generates and keeps the upload keystore. Don't lose access to that Expo
account — a new keystore cannot be substituted for an existing listing.

## Play Console setup

- **App name**: Tee Timer
- **Default language**: English (United Kingdom)
- **App or game**: App
- **Free or paid**: Paid — set €3.99 for the euro-zone, and let Play convert
  for GB/SE/etc. rather than pricing each manually.
- **Countries**: Spain, UK, Ireland, Germany, Netherlands, Sweden, Denmark,
  Norway, Finland, France, Belgium, Switzerland. That is where the golfers come
  from; there is no reason to sell it in markets with no Costa del Sol traffic,
  and a narrower list means fewer support languages to worry about.
- **Privacy policy URL**: `https://tee-timer-api.vercel.app/privacy`

### Data safety form

The honest answers, which are also the easy ones:

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **No** |
| Is all user data encrypted in transit? | Yes (HTTPS throughout) |
| Do you provide a way to request data deletion? | Not applicable — no data is collected |

Search parameters (date, players, holes, area) go to our server but are not
linked to a user, a device or an account, and Play's definition of collection
does not cover them. Server request logs are Vercel's ordinary infrastructure
logs, which Play explicitly excludes.

### Content rating questionnaire

Category: **Reference / utility**. Answer no to every violence, sex, drugs,
gambling and profanity question. It rates PEGI 3 / Everyone.

There is one question worth reading carefully: *does the app let users purchase
digital goods?* No — the booking happens on the club's own website, in the
browser, and we take no payment.

### Ads declaration

**This app contains no ads.** Say so; a wrong answer here is a policy strike.

---

## Store listing copy

Play allows a separate listing per language. The app speaks English, Spanish and
German, so the listing should too.

### English (en-GB)

**Title** (30 max)

```
Tee Timer
```

**Short description** (80 max)

```
Live green fees and tee times at 38 golf clubs on the Costa del Sol.
```

**Full description**

```
Every tee time on the coast, in one place.

Tee Timer reads the booking system of 38 golf clubs between Sotogrande and
Fuengirola and shows you what is actually free — and what it actually costs —
for any day in the next four weeks.

No more opening thirty club websites to find out who has a four-ball at nine
o'clock on Thursday, and no more guessing which of them is running a twilight
rate.

WHAT IT DOES

• Live prices, read from each club's own booking system at the moment you ask
• 38 clubs from Sotogrande and Valderrama east to Mijas and Fuengirola
• Filter by day, morning, afternoon or twilight, 18 or 9 holes, and party size
• Narrow to one stretch of coast — Estepona, Marbella, Mijas — for a faster search
• Cards with a photograph of every course, cheapest first, or a dense table of
  every tee time on the coast sorted by time or by price
• Spot the discounts: where a club is selling below its rack rate, you see both
• Tap a time to go straight to that club's booking page, or call the clubhouse
• English, Spanish and German
• Light and dark

HOW IT WORKS

Tee Timer does not hold an inventory of tee times and does not resell them. It
reads what each club is publishing on its own booking system, shows it to you,
and sends you to that club to book. You pay the club, at the club's own online
price. We take no commission and add no booking fee — so the price you see is
the price the club is selling at, not a marked-up one.

A search across the whole coast takes about fifteen seconds, because it really
is reading forty-odd booking systems while you wait. One area takes a couple of
seconds.

NO ADVERTISING

You paid for this app once. There are no ads, no tracking, no accounts and no
subscription. It does not ask for your location, your contacts or your email.

Tee Timer is an independent app and is not affiliated with any of the clubs
whose prices it shows.
```

### Spanish (es-ES)

**Short description**

```
Precios y salidas en directo de 38 campos de golf de la Costa del Sol.
```

**Full description**

```
Todas las salidas de la costa, en un solo sitio.

Tee Timer consulta el sistema de reservas de 38 campos de golf entre Sotogrande
y Fuengirola y te muestra lo que está realmente libre —y lo que cuesta de
verdad— para cualquier día de las próximas cuatro semanas.

Se acabó abrir treinta webs de clubes para saber quién tiene un partido de
cuatro a las nueve del jueves, y adivinar cuál está aplicando tarifa twilight.

QUÉ HACE

• Precios en directo, leídos del sistema de reservas de cada club al consultar
• 38 clubes desde Sotogrande y Valderrama hasta Mijas y Fuengirola
• Filtra por día, mañana, tarde o twilight, 18 o 9 hoyos y número de jugadores
• Limita la búsqueda a un tramo de costa —Estepona, Marbella, Mijas— y ve más rápido
• Fichas con foto de cada campo, de más barato a más caro, o una tabla con todas
  las salidas de la costa ordenadas por hora o por precio
• Detecta las ofertas: si un club vende por debajo de su tarifa oficial, ves ambas
• Pulsa una hora para ir directamente a la página de reservas del club, o llama
• Español, inglés y alemán
• Modo claro y oscuro

CÓMO FUNCIONA

Tee Timer no tiene inventario de salidas ni las revende. Lee lo que cada club
publica en su propio sistema de reservas, te lo muestra y te envía al club para
reservar. Pagas al club, al precio online del club. No cobramos comisión ni
añadimos gastos de gestión: el precio que ves es al que vende el club.

Una búsqueda por toda la costa tarda unos quince segundos, porque de verdad está
consultando más de cuarenta sistemas de reservas mientras esperas. Una sola zona
tarda un par de segundos.

SIN PUBLICIDAD

Has pagado una vez por esta app. No hay anuncios, ni rastreo, ni cuentas, ni
suscripción. No pide tu ubicación, ni tus contactos, ni tu correo.

Tee Timer es una app independiente y no está afiliada a ninguno de los clubes
cuyos precios muestra.
```

### German (de-DE)

**Short description**

```
Live-Greenfees und Startzeiten von 38 Golfclubs an der Costa del Sol.
```

**Full description**

```
Alle Startzeiten der Küste an einem Ort.

Tee Timer liest das Buchungssystem von 38 Golfclubs zwischen Sotogrande und
Fuengirola aus und zeigt dir, was tatsächlich frei ist — und was es wirklich
kostet — für jeden Tag der nächsten vier Wochen.

Kein Öffnen von dreißig Club-Websites mehr, um herauszufinden, wer am Donnerstag
um neun einen Vierer frei hat, und kein Raten, wer gerade einen Twilight-Tarif
anbietet.

WAS SIE KANN

• Live-Preise, im Moment der Abfrage aus dem Buchungssystem jedes Clubs gelesen
• 38 Clubs von Sotogrande und Valderrama bis Mijas und Fuengirola
• Filtern nach Tag, Vormittag, Nachmittag oder Twilight, 18 oder 9 Löcher, Spielerzahl
• Auf einen Küstenabschnitt eingrenzen — Estepona, Marbella, Mijas — für eine
  deutlich schnellere Suche
• Karten mit einem Foto von jedem Platz, günstigste zuerst, oder eine kompakte
  Tabelle aller Startzeiten, nach Zeit oder Preis sortiert
• Rabatte erkennen: verkauft ein Club unter Listenpreis, siehst du beide Preise
• Auf eine Zeit tippen und direkt zur Buchungsseite des Clubs, oder anrufen
• Deutsch, Englisch und Spanisch
• Heller und dunkler Modus

WIE ES FUNKTIONIERT

Tee Timer hält keine Startzeiten vor und verkauft sie nicht weiter. Die App
liest, was jeder Club in seinem eigenen Buchungssystem veröffentlicht, zeigt es
dir und schickt dich zum Buchen an den Club. Du zahlst dem Club, zum
Online-Preis des Clubs. Wir nehmen keine Provision und schlagen keine
Buchungsgebühr auf — der angezeigte Preis ist der Preis des Clubs.

Eine Suche über die ganze Küste dauert rund fünfzehn Sekunden, weil dabei
tatsächlich über vierzig Buchungssysteme abgefragt werden. Ein einzelnes Gebiet
dauert ein paar Sekunden.

KEINE WERBUNG

Du hast einmal für diese App bezahlt. Keine Werbung, kein Tracking, keine
Konten, kein Abo. Sie fragt weder nach deinem Standort noch nach Kontakten oder
E-Mail-Adresse.

Tee Timer ist eine unabhängige App und steht in keiner Verbindung zu den Clubs,
deren Preise sie anzeigt.
```

---

## Graphics still needed

Play will not let you publish without these.

| Asset | Size | Notes |
|---|---|---|
| App icon | 512×512 PNG | `mobile/assets/icon.png` exists — export at 512 |
| Feature graphic | 1024×500 PNG | Required. A course photo with the wordmark works |
| Phone screenshots | 2–8, min 1080px | See below |

Screenshots worth taking, in that order — the first two are what people actually
judge it on:

1. Results as cards, showing three or four courses with photos and prices
2. The table view, dense, showing the whole coast at once
3. A course page with its hero photo and full tee sheet
4. The search controls with the area chips visible
5. The same results screen in Spanish or German, to advertise the languages

## After the first upload

Use the **Internal testing** track first, not production. It reaches your own
device within minutes and is not subject to review delay, so you find the
"works in Expo Go, broken in a real build" problems privately. Promote to
production once it survives a real round of use on the course.

Expect the first production review to take a few days.
