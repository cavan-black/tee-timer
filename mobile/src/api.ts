/**
 * Client for the Tee Timer API.
 *
 * Point it at your deployment with EXPO_PUBLIC_API_URL (see mobile/README.md).
 * A whole-corridor search touches ~45 booking engines, so requests are given a
 * long ceiling and the last good response is cached for offline viewing.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE = (
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'
).replace(/\/$/, '');

const TIMEOUT_MS = 90_000;
const CACHE_PREFIX = 'teetimer:v1:';

export type Window = 'any' | 'morning' | 'afternoon' | 'twilight';
export type Holes = '9' | '18' | 'both';

export interface Course {
  key: string;
  club: string;
  course: string;
  label: string;
  area: string;
  holes: number;
  corridor: boolean;
  platform: string;
  image: string | null;
}

export interface TeeTime {
  courseKey: string;
  club: string;
  course: string;
  label: string;
  area: string;
  image: string | null;
  time: string;
  price: number;
  rackPrice: number | null;
  discountPct: number | null;
  rate: string;
  holes: number;
  spaces: number;
  includes: string[];
  bookingUrl: string;
}

export interface SearchResult {
  date: string;
  window: Window;
  players: number;
  holes: Holes;
  fetchedAt: string;
  coursesQueried: number;
  coursesWithSpace: number;
  teeTimes: TeeTime[];
  problems: { course: string; reason: string; kind: 'error' | 'empty' }[];
  fromCache?: boolean;
}

export interface SearchParams {
  date: string;
  window: Window;
  players: number;
  holes: Holes;
  areas?: string[];
  inland?: boolean;
}

/**
 * Course photos we host ourselves come back as "/api/image/<key>"; the ones
 * still hotlinked from a club come back absolute. Resolve the former against
 * the API host so both kinds are usable straight from the payload.
 */
export function imageUrl(image: string | null | undefined): string | null {
  if (!image) return null;
  return image.startsWith('/') ? `${API_BASE}${image}` : image;
}

/** Thrown when the caller aborted, as opposed to anything going wrong. */
export class SearchCancelled extends Error {
  constructor() {
    super('Search cancelled');
    this.name = 'SearchCancelled';
  }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  // Both the timeout and the caller abort the same controller, so the reason
  // has to be tracked separately -- otherwise a cancel looks like a timeout.
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);
  signal?.addEventListener('abort', () => controller.abort());
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      let detail = `${res.status}`;
      try {
        detail = (await res.json())?.detail ?? detail;
      } catch {
        /* body wasn't JSON; the status is all we have */
      }
      throw new Error(String(detail));
    }
    return (await res.json()) as T;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      if (!timedOut) throw new SearchCancelled();
      throw new Error("That took too long — the clubs' booking engines are slow right now.");
    }
    if (err instanceof TypeError) {
      throw new Error(`Can't reach the API at ${API_BASE}. Check EXPO_PUBLIC_API_URL.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function key(p: SearchParams): string {
  return `${CACHE_PREFIX}${p.date}|${p.window}|${p.players}|${p.holes}|${
    (p.areas ?? []).join('~')
  }|${p.inland ? 1 : 0}`;
}

export async function fetchCourses(): Promise<{ areas: string[]; courses: Course[] }> {
  const cacheKey = `${CACHE_PREFIX}courses`;
  try {
    const data = await request<{ areas: string[]; courses: Course[] }>('/api/courses');
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    return data;
  } catch (err) {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
    throw err;
  }
}

export async function search(p: SearchParams, signal?: AbortSignal): Promise<SearchResult> {
  const qs = new URLSearchParams({
    date: p.date,
    window: p.window,
    players: String(p.players),
    holes: p.holes,
  });
  if (p.areas?.length) qs.set('areas', p.areas.join(','));
  if (p.inland) qs.set('inland', 'true');

  const result = await request<SearchResult>(`/api/search?${qs}`, signal);
  await AsyncStorage.setItem(key(p), JSON.stringify(result)).catch(() => {});
  return result;
}

/** Last successful result for these filters, for offline / retry-failed views. */
export async function cachedSearch(p: SearchParams): Promise<SearchResult | null> {
  try {
    const raw = await AsyncStorage.getItem(key(p));
    return raw ? { ...(JSON.parse(raw) as SearchResult), fromCache: true } : null;
  } catch {
    return null;
  }
}
