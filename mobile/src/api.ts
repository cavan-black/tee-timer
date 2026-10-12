/**
 * Client for the Tee Timer API.
 *
 * Point it at your deployment with EXPO_PUBLIC_API_URL (see mobile/README.md).
 * A whole-corridor search touches ~45 booking engines, so requests are given a
 * long ceiling and the last good response is cached for offline viewing.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Falls back to production, not localhost. .env is gitignored, and an EAS
// build that misses it would otherwise ship pointing at a laptop that isn't
// there -- broken on every device, and only discovered after upload.
export const API_BASE = (
  process.env.EXPO_PUBLIC_API_URL ?? 'https://tee-timer-api.vercel.app'
).replace(/\/$/, '');

const TIMEOUT_MS = 90_000;
const CACHE_PREFIX = 'teetimer:v1:';

export type Window = 'any' | 'morning' | 'afternoon' | 'twilight';
export type Holes = '9' | '18' | 'both';

/** A coast, as the slug the API filters by — "costa-del-sol", "algarve". */
export type RegionKey = string;

export interface Region {
  key: RegionKey;
  /** Proper noun — "Costa del Sol", "Algarve" — so it is not translated. */
  name: string;
  /** Areas within this coast, already ordered west to east. */
  areas: string[];
}

/** What to search before /api/courses has answered. The server defaults to the
 *  same slug, so a request sent in that window is not a guess. */
export const DEFAULT_REGION: RegionKey = 'costa-del-sol';

export interface Course {
  key: string;
  club: string;
  course: string;
  label: string;
  /** The coast's display name, not its slug — compare against `Region.name`. */
  region: string;
  area: string;
  holes: number;
  corridor: boolean;
  platform: string;
  image: string | null;
  phone: string | null;
}

export interface TeeTime {
  courseKey: string;
  club: string;
  course: string;
  label: string;
  area: string;
  image: string | null;
  phone: string | null;
  time: string;
  price: number;
  rackPrice: number | null;
  discountPct: number | null;
  rate: string;
  holes: number;
  spaces: number;
  includes: string[];
  bookingUrl: string;
  /** Other rates the club sells for this same slot, collapsed into this row. */
  altRates?: number;
}

export interface SearchResult {
  date: string;
  region: RegionKey;
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
  region: RegionKey;
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
  return `${CACHE_PREFIX}${p.region}|${p.date}|${p.window}|${p.players}|${p.holes}|${
    (p.areas ?? []).join('~')
  }|${p.inland ? 1 : 0}`;
}

/**
 * Never hand back a payload the screen cannot render.
 *
 * An API older than the app answers without `regions` at all, which is a real
 * state and not a rare one: the app and the API deploy separately, and a phone
 * updates when the store says so. Coercing the shape here means the worst case
 * is a missing region tab, not a white screen.
 */
function asCourses(raw: any): { regions: Region[]; courses: Course[] } {
  return {
    regions: Array.isArray(raw?.regions) ? raw.regions : [],
    courses: Array.isArray(raw?.courses) ? raw.courses : [],
  };
}

export async function fetchCourses(): Promise<{ regions: Region[]; courses: Course[] }> {
  // v2: the payload gained regions and lost the flat `areas` list, so a cache
  // written by an older build would come back missing both.
  const cacheKey = `${CACHE_PREFIX}courses:v2`;
  try {
    const data = asCourses(await request<unknown>('/api/courses'));
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    return data;
  } catch (err) {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return asCourses(JSON.parse(cached));
    throw err;
  }
}

export async function search(p: SearchParams, signal?: AbortSignal): Promise<SearchResult> {
  const qs = new URLSearchParams({
    date: p.date,
    region: p.region,
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
