/** Search + results. Course cards you flick through, or a dense table. */
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  cachedSearch,
  fetchCourses,
  search,
  SearchCancelled,
  type Course,
  type Holes,
  type SearchResult,
  type TeeTime,
  type Window,
} from '../src/api';
import { Chip, CourseArt, Empty, Price, TableHead, TableRow } from '../src/components';
import { useI18n, type I18nState } from '../src/i18n';
import { LanguageButton } from '../src/language';
import { groupByCourse, rankProblems, sortTeeTimes, type Group, type SortBy } from '../src/results';
import { SearchProgress, SkeletonCards, SkeletonRows } from '../src/skeleton';
import { remember } from '../src/store';
import { Tutorial, useTutorial } from '../src/tutorial';
import { fill, theme, useTheme, type Palette } from '../src/theme';

const CARD_H = 208;
const CARD_GAP = theme.space(3);

// Labels are resolved at render time so switching language re-labels them.
const WINDOWS: Window[] = [
  'any',
  'morning',
  'afternoon',
  // Discounted late rounds; the engine treats this as 15:00 onwards.
  'twilight',
];
const HOLES: Holes[] = ['18', '9', 'both'];

type ViewMode = 'cards' | 'table';

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function nextDays(n: number) {
  const today = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}

/** "Sotogrande / San Roque" -> "Sotogrande" so the chips stay thumb-sized. */
function shortArea(area: string) {
  return area.split(' / ')[0].replace(' (Alhaurín)', '');
}

/** Results can be served from a short server-side cache, so say how old they
 *  actually are rather than implying everything is live to the second. */
function freshness(result: SearchResult, t: I18nState['t']): string {
  if (result.fromCache) return t('fresh.offline');
  const ageMs = Date.now() - new Date(result.fetchedAt).getTime();
  const mins = Math.floor(ageMs / 60000);
  if (!Number.isFinite(mins) || mins < 1) return t('fresh.now');
  return t('fresh.ago', { count: mins });
}

export default function Home() {
  const { colors: c, name: themeName, toggle: toggleTheme } = useTheme();
  const { t, locale } = useI18n();
  const s = useStyles(c);
  const insets = useSafeAreaInsets();
  const tutorial = useTutorial();
  const days = React.useMemo(() => nextDays(28), []);

  const [date, setDate] = React.useState(iso(days[1] ?? days[0]));
  const [window, setWindow] = React.useState<Window>('any');
  const [holes, setHoles] = React.useState<Holes>('18');
  const [players, setPlayers] = React.useState(2);
  const [areas, setAreas] = React.useState<string[]>([]);
  const [allAreas, setAllAreas] = React.useState<string[]>([]);
  const [allCourses, setAllCourses] = React.useState<Course[]>([]);

  const [view, setView] = React.useState<ViewMode>('cards');
  const [sortBy, setSortBy] = React.useState<SortBy>('time');

  const [result, setResult] = React.useState<SearchResult | null>(null);
  // Arrived, but held back until the progress bar has run to 100%.
  const [pending, setPending] = React.useState<SearchResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showProblems, setShowProblems] = React.useState(false);

  const params = React.useMemo(
    () => ({ date, window, players, holes, areas: areas.length ? areas : undefined }),
    [date, window, players, holes, areas],
  );

  React.useEffect(() => {
    fetchCourses()
      .then((d) => {
        setAllAreas(d.areas);
        setAllCourses(d.courses);
      })
      .catch(() => {}); // area chips are a refinement; the search works without them
  }, []);

  const inflight = React.useRef<AbortController | null>(null);

  const cancel = React.useCallback(() => {
    inflight.current?.abort();
    inflight.current = null;
    setPending(null);
    setLoading(false);
  }, []);

  /** Called once the bar reaches 100%; only then do the results appear. */
  const commit = React.useCallback(() => {
    if (!pending) return;
    setResult(pending);
    remember(params, pending);
    setPending(null);
    setLoading(false);
    inflight.current = null;
  }, [pending, params]);

  const run = React.useCallback(async () => {
    inflight.current?.abort(); // never let two searches race
    const controller = new AbortController();
    inflight.current = controller;

    setLoading(true);
    setError(null);
    setPending(null);
    // On success the progress bar owns the rest of the handoff, so `finally`
    // must not tear the loading state down underneath it.
    let handedOff = false;
    try {
      const fresh = await search(params, controller.signal);
      if (controller.signal.aborted) return;
      // Hand off to the progress bar: it runs to 100%, then commits. Snapping
      // results in while the bar sits at 92% looks like it gave up.
      handedOff = true;
      setPending(fresh);
      return;
    } catch (err: any) {
      if (err instanceof SearchCancelled || controller.signal.aborted) return;
      setError(err?.message ?? t('error.generic'));
      const fallback = await cachedSearch(params);
      if (fallback) {
        setResult(fallback);
        remember(params, fallback);
      }
    } finally {
      if (inflight.current === controller && !handedOff) {
        inflight.current = null;
        setLoading(false);
      }
    }
  }, [params, t]);


  // Show any cached result for these filters immediately, but don't auto-fetch:
  // one search is real load on ~45 clubs' booking systems.
  React.useEffect(() => {
    let live = true;
    // Changing a filter abandons any search in flight rather than letting a
    // stale one land over the new filters.
    cancel();
    setResult(null);
    setError(null);
    setShowProblems(false);
    cachedSearch(params).then((r) => {
      if (live && r) {
        setResult(r);
        remember(params, r);
      }
    });
    return () => {
      live = false;
    };
  }, [params, cancel]);

  const groups = React.useMemo(
    () => (result ? groupByCourse(result.teeTimes) : []),
    [result],
  );
  const rows = React.useMemo(
    () => (result ? sortTeeTimes(result.teeTimes, sortBy) : []),
    [result, sortBy],
  );
  const problems = React.useMemo(
    () => (result ? rankProblems(result.problems) : []),
    [result],
  );

  // How many clubs this search will actually hit, so the wait is explained
  // rather than just endured. Falls back to the full corridor before the
  // course list has loaded.
  const querying = React.useMemo(() => {
    if (!allCourses.length) return 45;
    return allCourses.filter(
      (x) =>
        x.corridor &&
        (holes !== '18' || x.holes === 18) &&
        (areas.length === 0 || areas.includes(x.area)),
    ).length;
  }, [allCourses, areas, holes]);

  const tap = (fn: () => void) => () => {
    Haptics.selectionAsync().catch(() => {});
    fn();
  };

  const openCourse = (courseKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push({
      pathname: '/course/[key]',
      params: { key: courseKey, date, window, players: String(players), holes },
    });
  };

  const openBooking = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Linking.openURL(url).catch(() => {});
  };

  const toggleArea = (area: string) =>
    setAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    );

  const header = (
    <View style={{ paddingTop: insets.top + theme.space(3) }}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.kicker}>{t('app.kicker')}</Text>
          <Text style={s.h1}>Tee Timer</Text>
        </View>
        <View style={s.headerButtons}>
          <Pressable
            onPress={tap(tutorial.open)}
            style={s.iconButton}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.help')}
          >
            <Text style={s.iconGlyph}>?</Text>
          </Pressable>
          <LanguageButton />
          <Pressable
            onPress={tap(toggleTheme)}
            style={s.iconButton}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t(themeName === 'dark' ? 'a11y.toLight' : 'a11y.toDark')}
          >
            {/* U+263C, not U+2600: the latter has an emoji presentation and
                both platforms drew it as a bright orange sticker, ignoring the
                muted colour. This one has no emoji form, so it takes the text
                colour and matches the moon. */}
            <Text style={s.iconGlyph}>{themeName === 'dark' ? '☼' : '☾'}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.strip}
      >
        {days.map((d) => {
          const key = iso(d);
          const active = key === date;
          return (
            <Pressable
              key={key}
              onPress={tap(() => setDate(key))}
              style={[s.day, active && s.dayOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[s.dayName, active && s.dayTextOn]}>
                {d.toLocaleDateString(locale, { weekday: 'short' })}
              </Text>
              <Text style={[s.dayNum, active && s.dayTextOn]}>{d.getDate()}</Text>
              <Text style={[s.dayMon, active && s.dayTextOn]}>
                {d.toLocaleDateString(locale, { month: 'short' })}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={s.controls}>
        <Segmented
          options={WINDOWS.map((k) => ({ key: k, label: t(`window.${k}`) }))}
          value={window}
          onChange={(v) => tap(() => setWindow(v as Window))()}
        />
        <Segmented
          options={HOLES.map((k) => ({ key: k, label: t(`holes.${k}`) }))}
          value={holes}
          onChange={(v) => tap(() => setHoles(v as Holes))()}
        />
        <View style={s.stepper}>
          <Pressable
            onPress={tap(() => setPlayers((p) => Math.max(1, p - 1)))}
            style={s.stepBtn}
            hitSlop={10}
            accessibilityLabel={t('a11y.fewerPlayers')}
          >
            <Text style={s.stepSign}>−</Text>
          </Pressable>
          <Text style={s.stepValue}>{t('players', { count: players })}</Text>
          <Pressable
            onPress={tap(() => setPlayers((p) => Math.min(4, p + 1)))}
            style={s.stepBtn}
            hitSlop={10}
            accessibilityLabel={t('a11y.morePlayers')}
          >
            <Text style={s.stepSign}>+</Text>
          </Pressable>
        </View>
      </View>

      {allAreas.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.areaStrip}
        >
          <Pressable
            onPress={tap(() => setAreas([]))}
            style={[s.area, areas.length === 0 && s.areaOn]}
          >
            <Text style={[s.areaText, areas.length === 0 && s.areaTextOn]}>{t('areas.all')}</Text>
          </Pressable>
          {allAreas.map((a) => {
            const on = areas.includes(a);
            return (
              <Pressable
                key={a}
                onPress={tap(() => toggleArea(a))}
                style={[s.area, on && s.areaOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[s.areaText, on && s.areaTextOn]}>{shortArea(a)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={s.ctaWrap}>
        <Pressable
          onPress={tap(loading ? cancel : run)}
          style={({ pressed }) => [
            s.cta,
            loading && s.ctaCancel,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t(loading ? 'a11y.cancelSearch' : 'cta.find')}
        >
          <Text style={[s.ctaText, loading && s.ctaCancelText]}>
            {t(loading ? 'cta.cancel' : 'cta.find')}
          </Text>
        </Pressable>
      </View>

      {/* In the header, not the empty slot: a cached result is usually already
          on screen, and the search still needs to show it is working. */}
      {loading && (
        <SearchProgress courses={querying} done={!!pending} onFinished={commit} />
      )}

      {error && (
        <View style={s.error}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {result && (
        <>
          <View style={s.summary}>
            <Stat label={t('stat.courses')} value={`${result.coursesWithSpace}`} />
            <Stat label={t('stat.teeTimes')} value={`${result.teeTimes.length}`} />
            <Stat
              label={t('stat.from')}
              accent
              value={
                result.teeTimes.length
                  ? `€${Math.min(...result.teeTimes.map((t) => t.price)).toFixed(0)}`
                  : '—'
              }
            />
          </View>

          <Text style={s.freshness}>{freshness(result, t)}</Text>

          <View style={s.viewBar}>
            {view === 'table' ? (
              <View style={s.sort}>
                {(['time', 'price'] as SortBy[]).map((k) => (
                  <Pressable key={k} onPress={tap(() => setSortBy(k))} style={s.sortItem}>
                    <Text style={[s.sortText, sortBy === k && s.sortTextOn]}>
                      {t(k === 'time' ? 'sort.time' : 'sort.price')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View />
            )}

            <View style={s.toggle}>
              {(['cards', 'table'] as ViewMode[]).map((v) => (
                <Pressable
                  key={v}
                  onPress={tap(() => setView(v))}
                  style={[s.toggleItem, view === v && s.toggleItemOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: view === v }}
                  accessibilityLabel={t(v === 'cards' ? 'a11y.cardsView' : 'a11y.tableView')}
                >
                  <Text
                    style={[s.toggleText, view === v && s.toggleTextOn]}
                    numberOfLines={1}
                  >
                    {v === 'cards' ? `▦  ${t('view.cards')}` : `☰  ${t('view.table')}`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {view === 'table' && rows.length > 0 && <TableHead />}
        </>
      )}
    </View>
  );

  const footer =
    result && problems.length > 0 ? (
      <View style={s.problems}>
        <Pressable onPress={tap(() => setShowProblems((v) => !v))} style={s.problemsHead}>
          <Text style={s.problemsTitle}>
            {t('problems.title', { count: problems.length })}
          </Text>
          <Text style={s.problemsChevron}>{showProblems ? '⌃' : '⌄'}</Text>
        </Pressable>
        {showProblems &&
          problems.map((p) => (
            <View key={`${p.course}-${p.reason}`} style={s.problemRow}>
              <Text style={s.problemCourse}>{p.course}</Text>
              <Text style={[s.problemReason, p.kind === 'error' && { color: c.danger }]}>
                {p.reason}
              </Text>
            </View>
          ))}
      </View>
    ) : null;

  const empty = loading ? (
    view === 'table' ? <SkeletonRows /> : <SkeletonCards />
  ) : result ? (
    <Empty title={t('empty.none.title')} body={t('empty.none.body')} />
  ) : (
    <Empty title={t('empty.start.title')} body={t('empty.start.body')} />
  );

  const refresh = <RefreshControl refreshing={loading} onRefresh={run} tintColor={c.accent} />;
  const pad = { paddingBottom: insets.bottom + theme.space(8) };

  if (view === 'table') {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Tutorial visible={tutorial.visible} onClose={tutorial.close} />
        <FlatList
          data={rows}
          keyExtractor={(t, i) => `${t.courseKey}-${t.time}-${i}`}
          renderItem={({ item }) => (
            <TableRow t={item} onPress={() => openBooking(item.bookingUrl)} />
          )}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          ListEmptyComponent={empty}
          contentContainerStyle={pad}
          refreshControl={refresh}
          initialNumToRender={20}
          windowSize={11}
          removeClippedSubviews
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Tutorial visible={tutorial.visible} onClose={tutorial.close} />
      <FlatList
        data={groups}
        keyExtractor={(g) => g.key}
        renderItem={({ item }) => (
          <CourseCard group={item} onPress={() => openCourse(item.key)} />
        )}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={empty}
        contentContainerStyle={pad}
        refreshControl={refresh}
        // Deliberately not snapping. Snap-to-card looked tidy but capped each
        // swipe at one card and killed the fling, so the list felt stuck.
        initialNumToRender={4}
        windowSize={7}
        removeClippedSubviews={false}
      />
    </View>
  );
}

function CourseCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const { colors: c } = useTheme();
  const { t } = useI18n();
  const s = useStyles(c);
  const { head, from, count } = group;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.985 }] }]}
      accessibilityRole="button"
      accessibilityLabel={`${head.label}, ${t('course.teeTimes', { count })}, ${t('course.from', {
        price: from,
      })}`}
    >
      {/* CourseArt lays down its own scrim; a second one turns photos black. */}
      <CourseArt image={head.image} seed={head.club} style={s.cardArt} radius={theme.radius.lg} />
      <View style={s.cardBody}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.cardArea}>{head.area.toUpperCase()}</Text>
          <Text style={s.cardTitle} numberOfLines={2}>
            {head.label}
          </Text>
          <View style={s.cardChips}>
            <Chip label={t('card.times', { count })} />
            <Chip label={t('card.from', { time: head.time })} />
            <Chip label={`${head.holes}h`} />
          </View>
        </View>
        <Price value={from} rack={head.rackPrice} off={head.discountPct} big onImage />
      </View>
    </Pressable>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const { colors: c } = useTheme();
  const s = useStyles(c);
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label.toUpperCase()}</Text>
      <Text style={[s.statValue, accent && { color: c.accent }]}>{value}</Text>
    </View>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  const { colors: c } = useTheme();
  const s = useStyles(c);
  return (
    <View style={s.seg}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[s.segItem, on && s.segItemOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            {/* German runs long — "Nachmittag", "Startzeiten" — and four of
                them across a phone wrapped onto a second line, which threw the
                row's height out. Shrink to fit rather than wrap or truncate. */}
            <Text
              style={[s.segText, on && s.segTextOn]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}


function useStyles(c: Palette) {
  return React.useMemo(() => makeStyles(c), [c]);
}

const makeStyles = (c: Palette) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.space(5),
    paddingBottom: theme.space(3),
  },
  headerButtons: { flexDirection: 'row', gap: theme.space(2), alignItems: 'center' },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    // No fill or border: these are secondary to the search, and a bright pill
    // in the corner pulled the eye away from it.
  },
  iconGlyph: { fontSize: 17, color: c.muted },
  kicker: { ...theme.font.caption, color: c.accent, marginBottom: 4 },
  h1: { ...theme.font.display, color: c.text },

  strip: { paddingHorizontal: theme.space(5), gap: 8, paddingVertical: theme.space(1) },
  day: {
    width: 58,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayOn: { backgroundColor: c.accent, borderColor: c.accent },
  dayName: { ...theme.font.caption, color: c.faint },
  dayNum: { ...theme.font.title, color: c.text, marginVertical: 1 },
  dayMon: { ...theme.font.caption, color: c.faint },
  dayTextOn: { color: c.accentInk },

  controls: { paddingHorizontal: theme.space(5), paddingTop: theme.space(4), gap: theme.space(2) },
  seg: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderRadius: theme.radius.pill,
    padding: 4,
  },
  segItem: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segItemOn: { backgroundColor: c.surfaceHi },
  segText: { ...theme.font.label, color: c.muted },
  segTextOn: { color: c.text },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.surface,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepBtn: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepSign: { color: c.text, fontSize: 22, lineHeight: 24, fontWeight: '600' },
  stepValue: { ...theme.font.label, color: c.text, textAlign: 'center' },

  areaStrip: {
    paddingHorizontal: theme.space(5),
    gap: 6,
    paddingTop: theme.space(3),
  },
  area: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  areaOn: { borderColor: c.accent, backgroundColor: c.surfaceHi },
  areaText: { ...theme.font.caption, letterSpacing: 0.2, color: c.muted },
  areaTextOn: { color: c.accent },

  ctaWrap: { paddingHorizontal: theme.space(5), paddingTop: theme.space(3) },
  cta: {
    backgroundColor: c.accent,
    borderRadius: theme.radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
    ...theme.shadow.card,
  },
  ctaText: { ...theme.font.title, color: c.accentInk },
  ctaCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: c.lineStrong,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaCancelText: { color: c.muted },

  error: {
    marginHorizontal: theme.space(5),
    marginTop: theme.space(3),
    padding: theme.space(3),
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(255,135,133,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,135,133,0.35)',
  },
  errorText: { ...theme.font.body, color: c.danger },

  summary: {
    flexDirection: 'row',
    gap: theme.space(2),
    paddingHorizontal: theme.space(5),
    paddingTop: theme.space(5),
  },
  stat: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: theme.radius.md,
    padding: theme.space(3),
  },
  statLabel: { ...theme.font.caption, color: c.faint },
  statValue: { ...theme.font.title, color: c.text, marginTop: 2 },

  freshness: {
    ...theme.font.caption,
    fontWeight: '500',
    letterSpacing: 0,
    color: c.faint,
    paddingHorizontal: theme.space(5),
    paddingTop: theme.space(2),
  },
  viewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space(5),
    paddingTop: theme.space(4),
    paddingBottom: theme.space(2),
  },
  sort: { flexDirection: 'row', gap: theme.space(3) },
  sortItem: { paddingVertical: 4 },
  sortText: { ...theme.font.caption, letterSpacing: 0.2, color: c.faint },
  sortTextOn: { color: c.accent },
  toggle: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderRadius: theme.radius.pill,
    padding: 3,
  },
  toggleItem: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: theme.radius.pill },
  toggleItemOn: { backgroundColor: c.accent },
  toggleText: { ...theme.font.caption, letterSpacing: 0.2, color: c.muted },
  toggleTextOn: { color: c.accentInk },

  card: {
    height: CARD_H,
    marginHorizontal: theme.space(5),
    marginTop: CARD_GAP,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    ...theme.shadow.card,
  },
  cardArt: { ...fill },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.space(3),
    padding: theme.space(4),
  },
  cardArea: { ...theme.font.caption, color: c.accent },
  cardTitle: { ...theme.font.title, color: c.onImage, marginTop: 3, fontSize: 21 },
  cardChips: { flexDirection: 'row', gap: 6, marginTop: 9, flexWrap: 'wrap' },

  problems: {
    marginHorizontal: theme.space(5),
    marginTop: theme.space(6),
    backgroundColor: c.surface,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  problemsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.space(3),
  },
  problemsTitle: { ...theme.font.label, color: c.muted },
  problemsChevron: { color: c.faint, fontSize: 15 },
  problemRow: {
    paddingHorizontal: theme.space(3),
    paddingBottom: theme.space(3),
  },
  problemCourse: { ...theme.font.caption, letterSpacing: 0.2, color: c.text },
  problemReason: { ...theme.font.caption, fontWeight: '500', letterSpacing: 0, color: c.faint },

  loading: { padding: theme.space(10), alignItems: 'center', gap: theme.space(4) },
  loadingText: { ...theme.font.body, color: c.muted, textAlign: 'center', lineHeight: 21 },
});
