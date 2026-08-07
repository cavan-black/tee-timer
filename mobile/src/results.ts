/**
 * Pure shaping of a search result. No React, no RN — so it can be unit tested
 * and reasoned about on its own.
 */
import type { TeeTime } from './api';

export type SortBy = 'time' | 'price';

/**
 * One row per playable slot, cheapest rate first.
 *
 * A club routinely sells several products against the same tee time -- a green
 * fee, the same fee with a buggy, a four-for-three offer -- and the booking
 * engines return them all. Villa Padierna alone lists 08:00 three times. That
 * is honest data but unusable as a list: on a normal day 61% of the rows are a
 * slot already shown, so the same round is repeated instead of the next one.
 *
 * So each slot collapses to its cheapest rate, carrying a count of the others.
 * Nothing is lost -- the club's own page is where the choice gets made anyway,
 * and the cheapest is the number worth comparing against other clubs.
 */
export function dedupeSlots(times: TeeTime[]): TeeTime[] {
  const best = new Map<string, TeeTime>();
  const seen = new Map<string, number>();
  for (const t of times) {
    const slot = `${t.courseKey}@${t.time}`;
    seen.set(slot, (seen.get(slot) ?? 0) + 1);
    const held = best.get(slot);
    if (!held || t.price < held.price) best.set(slot, t);
  }
  return [...best.entries()].map(([slot, t]) => {
    const alts = (seen.get(slot) ?? 1) - 1;
    return alts > 0 ? { ...t, altRates: alts } : t;
  });
}

export interface Group {
  key: string;
  /** Cheapest slot at this course, but carrying the day's earliest tee time. */
  head: TeeTime;
  from: number;
  count: number;
  earliest: string;
}

/**
 * Does this rate come with a buggy?
 *
 * Clubs are inconsistent about where they say so: 694 rows on a sample day
 * declare it in `includes`, but 839 mention it only in the rate name, so both
 * have to be read.
 *
 * Deliberately not matching "carro" or "carrito" — in Spanish those are a pull
 * trolley, not a motorised buggy, and flagging one as the other would promise
 * something the green fee does not include. `\bcart\b` is safe for the same
 * reason: the word boundary keeps it off "carrito".
 */
const BUGGY = /\bbugg(y|ies)\b|\bcarts?\b/i;

export function includesBuggy(t: Pick<TeeTime, 'rate' | 'includes'>): boolean {
  return BUGGY.test(t.rate) || t.includes.some((i) => BUGGY.test(i));
}

/** One entry per course, cheapest first — the card deck. */
export function groupByCourse(times: TeeTime[]): Group[] {
  const map = new Map<string, TeeTime[]>();
  // Count playable slots, not rate rows, or a club selling three products per
  // slot claims three times the availability it has.
  for (const t of dedupeSlots(times)) {
    const list = map.get(t.courseKey);
    if (list) list.push(t);
    else map.set(t.courseKey, [t]);
  }

  return [...map.entries()]
    .map(([key, list]) => {
      const cheapest = list.reduce((a, b) => (b.price < a.price ? b : a));
      const earliest = list.reduce((a, b) => (b.time < a.time ? b : a)).time;
      return {
        key,
        head: { ...cheapest, time: earliest },
        from: cheapest.price,
        count: list.length,
        earliest,
      };
    })
    .sort((a, b) => a.from - b.from || a.key.localeCompare(b.key));
}

/** Table ordering, one row per slot. Ties break on the other axis so the list is stable. */
export function sortTeeTimes(times: TeeTime[], by: SortBy): TeeTime[] {
  const copy = dedupeSlots(times);
  copy.sort((a, b) =>
    by === 'price'
      ? a.price - b.price || a.time.localeCompare(b.time)
      : a.time.localeCompare(b.time) || a.price - b.price,
  );
  return copy;
}

/** Courses the search couldn't use, worst first, for the disclosure at the end. */
export function rankProblems<T extends { kind: 'error' | 'empty' }>(problems: T[]): T[] {
  return [...problems].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'error' ? -1 : 1));
}
