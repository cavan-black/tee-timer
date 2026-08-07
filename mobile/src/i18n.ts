/**
 * Interface copy, in three languages.
 *
 * English, Spanish and German cover roughly two thirds of golf visitors to the
 * coast (GB 38.8%, Spain 14%, Germany 11.7%, Ireland 10.7%) and effectively all
 * of the resident players, who are the repeat users.
 *
 * Only the app's own chrome is translated. Club names, rate names ("GF 18H
 * TWILIGHT", "2 GREEN FEES + BUGGY") and the "includes" chips come from each
 * club's booking system in whatever language they wrote them, and are passed
 * through untouched — inventing translations for someone else's price list
 * would be worse than leaving it as they sell it.
 *
 * Same shape as ./theme: a context plus AsyncStorage, read at render time so
 * switching language never needs a reload.
 */
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Lang = 'en' | 'es' | 'de';

export const LANGS: { key: Lang; label: string; short: string; locale: string }[] = [
  { key: 'en', label: 'English', short: 'EN', locale: 'en-GB' },
  { key: 'es', label: 'Español', short: 'ES', locale: 'es-ES' },
  { key: 'de', label: 'Deutsch', short: 'DE', locale: 'de-DE' },
];

type Dict = Record<string, string>;

const en: Dict = {
  // header + search
  'app.kicker': 'COSTA DEL SOL',
  'a11y.help': 'How it works',
  'a11y.toLight': 'Switch to light mode',
  'a11y.toDark': 'Switch to dark mode',
  'a11y.language': 'Change language',
  'window.any': 'Any',
  'window.morning': 'Morning',
  'window.afternoon': 'Afternoon',
  'window.twilight': 'Twilight',
  'holes.18': '18 holes',
  'holes.9': '9 holes',
  'holes.both': 'Both',
  'players_one': '{count} player',
  'players_other': '{count} players',
  'a11y.fewerPlayers': 'Fewer players',
  'a11y.morePlayers': 'More players',
  'areas.all': 'All areas',
  'cta.find': 'Find tee times',
  'cta.cancel': 'Cancel',
  'a11y.cancelSearch': 'Cancel search',
  'error.generic': 'Something went wrong.',

  // results
  'stat.courses': 'Courses',
  'stat.teeTimes': 'Tee times',
  'stat.from': 'From',
  'fresh.offline': 'Offline copy — pull down to refresh',
  'fresh.now': 'Prices read just now',
  'fresh.ago_one': 'Prices read {count} min ago',
  'fresh.ago_other': 'Prices read {count} mins ago',
  'sort.time': 'By time',
  'sort.price': 'By price',
  'view.cards': 'Cards',
  'view.table': 'Table',
  'a11y.cardsView': 'Card view',
  'a11y.tableView': 'Table view',
  'problems.title_one': '{count} course with nothing to show',
  'problems.title_other': '{count} courses with nothing to show',
  'card.times_one': '{count} time',
  'card.times_other': '{count} times',
  'card.from': 'from {time}',
  'empty.none.title': 'Nothing free',
  'empty.none.body':
    'No tee times matched. Try another day, a wider time window, or 9 holes.',
  'empty.start.title': 'Pick a day',
  'empty.start.body': 'Choose a date and time of day, then tap Find tee times.',

  // table
  'table.tee': 'TEE',
  'table.course': 'COURSE',
  'table.max': 'MAX',
  'table.price': 'PRICE',
  'incl.buggy': 'Buggy',
  'rates.more_one': '+{count} rate',
  'rates.more_other': '+{count} rates',
  'spaces_one': '{count} space',
  'spaces_other': '{count} spaces',

  // progress
  'progress.almost': 'Almost there',
  'progress.checking_one': 'Checking {count} course',
  'progress.checking_other': 'Checking {count} courses',
  'progress.body':
    "Reading each club's own booking system for the prices they're selling right now.",

  // course screen
  'a11y.back': 'Back',
  'course.gone.title': 'No longer listed',
  'course.gone.body': 'Run the search again to refresh this course.',
  'course.teeTimes_one': '{count} tee time',
  'course.teeTimes_other': '{count} tee times',
  'course.from': 'from €{price}',
  'course.book': 'Book online',
  'course.call': 'Call',
  'course.footnote':
    "Prices are the club's own online rate, per player. Tapping a tee time opens "
    + "the club's booking page — Tee Timer never takes payment or holds a reservation.",
  'credits.photo':
    'The photograph above was published by {club} to advertise its own course, and '
    + 'remains its copyright. Tee Timer claims no ownership of it.',
  'credits.link': 'Image credits and removal requests',

  // tutorial
  'tut.title': 'Every tee time on the coast',
  'tut.lede':
    "Live prices from 38 clubs between Sotogrande and Fuengirola, read straight "
    + "from each club's own booking system.",
  'tut.1.title': 'Pick a day and a time',
  'tut.1.body':
    'Choose a date, then Any time, Morning or Afternoon. Set how many of you are '
    + 'playing and whether you want 18 or 9 holes.',
  'tut.2.title': 'Narrow it down if you like',
  'tut.2.body':
    'The area chips limit the search to one stretch of coast — Marbella, Estepona, '
    + 'Mijas. Fewer clubs also means a much faster search.',
  'tut.3.title': 'Tap Find tee times',
  'tut.3.body':
    "This reads every club's own booking system live, so the whole coast takes "
    + 'around fifteen seconds. One area takes a couple. You can cancel at any point '
    + 'to change your mind.',
  'tut.4.title': 'Cards or table',
  'tut.4.body':
    'Cards show one photo per course, cheapest first. Table lists every tee time on '
    + 'the coast at once, by time or by price.',
  'tut.5.title': 'Tapping a club takes you to their booking page',
  'tut.5.body':
    "Open a course to see its full tee sheet, then tap a time to go straight to that "
    + "club's own site to book it. Tee Timer never takes payment and never holds a "
    + 'reservation — it only finds the prices.',
  'tut.cta': "Let's play",
};

const es: Dict = {
  'app.kicker': 'COSTA DEL SOL',
  'a11y.help': 'Cómo funciona',
  'a11y.toLight': 'Cambiar a modo claro',
  'a11y.toDark': 'Cambiar a modo oscuro',
  'a11y.language': 'Cambiar idioma',
  'window.any': 'Cualquiera',
  'window.morning': 'Mañana',
  'window.afternoon': 'Tarde',
  'window.twilight': 'Twilight',
  'holes.18': '18 hoyos',
  'holes.9': '9 hoyos',
  'holes.both': 'Ambos',
  'players_one': '{count} jugador',
  'players_other': '{count} jugadores',
  'a11y.fewerPlayers': 'Menos jugadores',
  'a11y.morePlayers': 'Más jugadores',
  'areas.all': 'Todas las zonas',
  'cta.find': 'Buscar salidas',
  'cta.cancel': 'Cancelar',
  'a11y.cancelSearch': 'Cancelar búsqueda',
  'error.generic': 'Algo ha salido mal.',

  'stat.courses': 'Campos',
  'stat.teeTimes': 'Salidas',
  'stat.from': 'Desde',
  'fresh.offline': 'Copia sin conexión — desliza para actualizar',
  'fresh.now': 'Precios consultados ahora mismo',
  'fresh.ago_one': 'Precios consultados hace {count} min',
  'fresh.ago_other': 'Precios consultados hace {count} min',
  'sort.time': 'Por hora',
  'sort.price': 'Por precio',
  'view.cards': 'Fichas',
  'view.table': 'Tabla',
  'a11y.cardsView': 'Vista de fichas',
  'a11y.tableView': 'Vista de tabla',
  'problems.title_one': '{count} campo sin resultados',
  'problems.title_other': '{count} campos sin resultados',
  'card.times_one': '{count} salida',
  'card.times_other': '{count} salidas',
  'card.from': 'desde {time}',
  'empty.none.title': 'Nada libre',
  'empty.none.body':
    'No hay salidas que coincidan. Prueba otro día, una franja más amplia o 9 hoyos.',
  'empty.start.title': 'Elige un día',
  'empty.start.body': 'Elige la fecha y la franja horaria, y pulsa Buscar salidas.',

  'table.tee': 'HORA',
  'table.course': 'CAMPO',
  'table.max': 'MÁX',
  'table.price': 'PRECIO',
  'incl.buggy': 'Buggy',
  'rates.more_one': '+{count} tarifa',
  'rates.more_other': '+{count} tarifas',
  'spaces_one': '{count} plaza',
  'spaces_other': '{count} plazas',

  'progress.almost': 'Ya casi está',
  'progress.checking_one': 'Consultando {count} campo',
  'progress.checking_other': 'Consultando {count} campos',
  'progress.body':
    'Leyendo el sistema de reservas de cada club para ver los precios que ofrecen '
    + 'en este momento.',

  'a11y.back': 'Atrás',
  'course.gone.title': 'Ya no aparece',
  'course.gone.body': 'Repite la búsqueda para actualizar este campo.',
  'course.teeTimes_one': '{count} salida',
  'course.teeTimes_other': '{count} salidas',
  'course.from': 'desde {price} €',
  'course.book': 'Reservar online',
  'course.call': 'Llamar',
  'course.footnote':
    'Los precios son la tarifa online del propio club, por jugador. Al pulsar una '
    + 'salida se abre la página de reservas del club — Tee Timer nunca cobra ni '
    + 'retiene una reserva.',
  'credits.photo':
    'La fotografía superior fue publicada por {club} para promocionar su propio '
    + 'campo y sigue siendo de su propiedad. Tee Timer no reclama ningún derecho '
    + 'sobre ella.',
  'credits.link': 'Créditos de las imágenes y solicitudes de retirada',

  'tut.title': 'Todas las salidas de la costa',
  'tut.lede':
    'Precios en directo de 38 clubes entre Sotogrande y Fuengirola, leídos '
    + 'directamente del sistema de reservas de cada club.',
  'tut.1.title': 'Elige un día y una hora',
  'tut.1.body':
    'Elige la fecha y luego Cualquiera, Mañana o Tarde. Indica cuántos sois y si '
    + 'queréis 18 o 9 hoyos.',
  'tut.2.title': 'Afina si quieres',
  'tut.2.body':
    'Las zonas limitan la búsqueda a un tramo de costa — Marbella, Estepona, Mijas. '
    + 'Menos clubes también significa una búsqueda mucho más rápida.',
  'tut.3.title': 'Pulsa Buscar salidas',
  'tut.3.body':
    'Consultamos en directo el sistema de reservas de cada club, así que toda la '
    + 'costa tarda unos quince segundos. Una sola zona, un par. Puedes cancelar '
    + 'cuando quieras.',
  'tut.4.title': 'Fichas o tabla',
  'tut.4.body':
    'Las fichas muestran una foto por campo, de más barato a más caro. La tabla '
    + 'lista todas las salidas de la costa a la vez, por hora o por precio.',
  'tut.5.title': 'Al pulsar un club vas a su página de reservas',
  'tut.5.body':
    'Abre un campo para ver todas sus salidas y pulsa una hora para ir directamente '
    + 'a la web del club y reservarla. Tee Timer nunca cobra ni retiene una reserva: '
    + 'solo encuentra los precios.',
  'tut.cta': 'A jugar',
};

const de: Dict = {
  'app.kicker': 'COSTA DEL SOL',
  'a11y.help': 'So funktioniert es',
  'a11y.toLight': 'Zum hellen Modus wechseln',
  'a11y.toDark': 'Zum dunklen Modus wechseln',
  'a11y.language': 'Sprache ändern',
  'window.any': 'Egal',
  'window.morning': 'Vormittag',
  'window.afternoon': 'Nachmittag',
  'window.twilight': 'Twilight',
  'holes.18': '18 Löcher',
  'holes.9': '9 Löcher',
  'holes.both': 'Beide',
  'players_one': '{count} Spieler',
  'players_other': '{count} Spieler',
  'a11y.fewerPlayers': 'Weniger Spieler',
  'a11y.morePlayers': 'Mehr Spieler',
  'areas.all': 'Alle Gebiete',
  'cta.find': 'Startzeiten suchen',
  'cta.cancel': 'Abbrechen',
  'a11y.cancelSearch': 'Suche abbrechen',
  'error.generic': 'Etwas ist schiefgelaufen.',

  'stat.courses': 'Plätze',
  'stat.teeTimes': 'Startzeiten',
  'stat.from': 'Ab',
  'fresh.offline': 'Offline-Kopie — zum Aktualisieren ziehen',
  'fresh.now': 'Preise gerade eben abgerufen',
  'fresh.ago_one': 'Preise vor {count} Min. abgerufen',
  'fresh.ago_other': 'Preise vor {count} Min. abgerufen',
  'sort.time': 'Nach Zeit',
  'sort.price': 'Nach Preis',
  'view.cards': 'Karten',
  'view.table': 'Tabelle',
  'a11y.cardsView': 'Kartenansicht',
  'a11y.tableView': 'Tabellenansicht',
  'problems.title_one': '{count} Platz ohne Ergebnis',
  'problems.title_other': '{count} Plätze ohne Ergebnis',
  'card.times_one': '{count} Startzeit',
  'card.times_other': '{count} Startzeiten',
  'card.from': 'ab {time}',
  'empty.none.title': 'Nichts frei',
  'empty.none.body':
    'Keine passenden Startzeiten. Versuche einen anderen Tag, ein größeres '
    + 'Zeitfenster oder 9 Löcher.',
  'empty.start.title': 'Wähle einen Tag',
  'empty.start.body':
    'Wähle Datum und Tageszeit und tippe dann auf Startzeiten suchen.',

  'table.tee': 'ZEIT',
  'table.course': 'PLATZ',
  'table.max': 'MAX',
  'table.price': 'PREIS',
  'incl.buggy': 'Buggy',
  'rates.more_one': '+{count} Tarif',
  'rates.more_other': '+{count} Tarife',
  'spaces_one': '{count} Platz frei',
  'spaces_other': '{count} Plätze frei',

  'progress.almost': 'Fast fertig',
  'progress.checking_one': '{count} Platz wird geprüft',
  'progress.checking_other': '{count} Plätze werden geprüft',
  'progress.body':
    'Wir lesen das Buchungssystem jedes Clubs aus, um die aktuell angebotenen '
    + 'Preise zu finden.',

  'a11y.back': 'Zurück',
  'course.gone.title': 'Nicht mehr gelistet',
  'course.gone.body': 'Starte die Suche neu, um diesen Platz zu aktualisieren.',
  'course.teeTimes_one': '{count} Startzeit',
  'course.teeTimes_other': '{count} Startzeiten',
  'course.from': 'ab {price} €',
  'course.book': 'Online buchen',
  'course.call': 'Anrufen',
  'course.footnote':
    'Die Preise sind der Online-Tarif des Clubs, pro Spieler. Ein Tipp auf eine '
    + 'Startzeit öffnet die Buchungsseite des Clubs — Tee Timer nimmt keine '
    + 'Zahlungen entgegen und reserviert nichts.',
  'credits.photo':
    'Das Foto oben wurde von {club} veröffentlicht, um den eigenen Platz zu '
    + 'bewerben, und bleibt dessen Urheberrecht. Tee Timer erhebt darauf keinen '
    + 'Anspruch.',
  'credits.link': 'Bildnachweise und Entfernungsanfragen',

  'tut.title': 'Alle Startzeiten der Küste',
  'tut.lede':
    'Live-Preise von 38 Clubs zwischen Sotogrande und Fuengirola, direkt aus dem '
    + 'Buchungssystem des jeweiligen Clubs.',
  'tut.1.title': 'Tag und Uhrzeit wählen',
  'tut.1.body':
    'Wähle ein Datum und dann Egal, Vormittag oder Nachmittag. Lege fest, wie viele '
    + 'ihr seid und ob ihr 18 oder 9 Löcher spielen wollt.',
  'tut.2.title': 'Bei Bedarf eingrenzen',
  'tut.2.body':
    'Die Gebiete beschränken die Suche auf einen Küstenabschnitt — Marbella, '
    + 'Estepona, Mijas. Weniger Clubs bedeuten auch eine deutlich schnellere Suche.',
  'tut.3.title': 'Auf Startzeiten suchen tippen',
  'tut.3.body':
    'Das liest das Buchungssystem jedes Clubs live aus, daher dauert die ganze '
    + 'Küste rund fünfzehn Sekunden. Ein einzelnes Gebiet nur ein paar. Du kannst '
    + 'jederzeit abbrechen.',
  'tut.4.title': 'Karten oder Tabelle',
  'tut.4.body':
    'Karten zeigen ein Foto pro Platz, günstigste zuerst. Die Tabelle listet alle '
    + 'Startzeiten der Küste auf einmal, nach Zeit oder Preis.',
  'tut.5.title': 'Ein Tipp auf einen Club führt zu dessen Buchungsseite',
  'tut.5.body':
    'Öffne einen Platz, um alle Startzeiten zu sehen, und tippe auf eine Zeit, um '
    + 'direkt auf der Website des Clubs zu buchen. Tee Timer nimmt keine Zahlungen '
    + 'entgegen und reserviert nichts — es findet nur die Preise.',
  'tut.cta': 'Auf geht’s',
};

const DICTS: Record<Lang, Dict> = { en, es, de };

/**
 * Keys English defines that `lang` does not.
 *
 * `translate` deliberately falls back to English, which means a missed
 * translation looks fine at a glance — the app just quietly speaks English at
 * a German user. This is the check that actually catches it; a test asserts it
 * stays empty.
 */
export function missingKeys(lang: Lang): string[] {
  const dict = DICTS[lang] ?? {};
  return Object.keys(en).filter((k) => dict[k] === undefined);
}

/**
 * Look up a key, substituting `{name}` placeholders.
 *
 * Plurals: pass `count` and the lookup prefers `<key>_one` / `<key>_other`.
 * All three languages here split at exactly one, so a single rule is honest;
 * a language with richer plural forms would need more than this.
 */
export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const dict = DICTS[lang] ?? en;
  let id = key;
  if (vars && typeof vars.count === 'number') {
    const plural = `${key}_${vars.count === 1 ? 'one' : 'other'}`;
    if (dict[plural] ?? en[plural]) id = plural;
  }
  // Falling back to English beats showing a raw key if a translation is missed.
  const raw = dict[id] ?? en[id];
  if (raw === undefined) return key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name) =>
    vars[name] === undefined ? m : String(vars[name]),
  );
}

// --------------------------------------------------------------------------

const STORAGE_KEY = 'teetimer:lang';

/** The phone's language, if we speak it. No native module needed: Hermes ships
 *  Intl on both platforms, and this is the one thing we need from it. */
function deviceLang(): Lang {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    const base = tag.toLowerCase().split('-')[0];
    if (base === 'es' || base === 'de') return base;
  } catch {
    // Intl missing or locked down — English is a safe default here.
  }
  return 'en';
}

export interface I18nState {
  lang: Lang;
  /** BCP-47 tag for Intl date formatting. */
  locale: string;
  setLang: (next: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = React.createContext<I18nState | null>(null);

export function useI18nState(): I18nState {
  const [lang, setLangState] = React.useState<Lang>(deviceLang);

  React.useEffect(() => {
    let live = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        // A saved choice wins; otherwise we keep following the phone.
        if (live && (saved === 'en' || saved === 'es' || saved === 'de')) setLangState(saved);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const setLang = React.useCallback((next: Lang) => {
    setLangState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  return React.useMemo(() => {
    const locale = LANGS.find((l) => l.key === lang)?.locale ?? 'en-GB';
    return {
      lang,
      locale,
      setLang,
      t: (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    };
  }, [lang, setLang]);
}

export const I18nProvider = I18nContext.Provider;

export function useI18n(): I18nState {
  const ctx = React.useContext(I18nContext);
  // Usable outside the provider (tests) rather than throwing.
  return (
    ctx ?? {
      lang: 'en',
      locale: 'en-GB',
      setLang: () => {},
      t: (key, vars) => translate('en', key, vars),
    }
  );
}
