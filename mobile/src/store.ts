/**
 * The result of the most recent search, held in memory.
 *
 * The course screen needs the same rows the list screen already has. Passing
 * them through navigation params would serialise a few hundred objects into a
 * URL, and re-running the search would hit ~45 booking engines to redisplay
 * data we are already holding — so the two screens share this instead.
 */
import type { SearchParams, SearchResult } from './api';

let current: { params: SearchParams; result: SearchResult } | null = null;

export function remember(params: SearchParams, result: SearchResult): void {
  current = { params, result };
}

export function recall(): { params: SearchParams; result: SearchResult } | null {
  return current;
}

export function forget(): void {
  current = null;
}
