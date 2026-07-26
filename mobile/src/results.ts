/**
 * Pure shaping of a search result. No React, no RN — so it can be unit tested
 * and reasoned about on its own.
 */
import type { TeeTime } from './api';

export type SortBy = 'time' | 'price';

export interface Group {
  key: string;
  /** Cheapest slot at this course, but carrying the day's earliest tee time. */
  head: TeeTime;
  from: number;
  count: number;
  earliest: string;
}

/** One entry per course, cheapest first — the card deck. */
export function groupByCourse(times: TeeTime[]): Group[] {
  const map = new Map<string, TeeTime[]>();
  for (const t of times) {
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

/** Table ordering. Ties break on the other axis so the list is stable. */
export function sortTeeTimes(times: TeeTime[], by: SortBy): TeeTime[] {
  const copy = [...times];
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
