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
  search,
  type Holes,
  type SearchResult,
  type TeeTime,
  type Window,
} from '../src/api';
import { Chip, CourseArt, Empty, Price, TableHead, TableRow } from '../src/components';
import { fill, theme } from '../src/theme';

const c = theme.color;
const CARD_H = 208;
const CARD_GAP = theme.space(3);
const SNAP = CARD_H + CARD_GAP;

const WINDOWS: { key: Window; label: string }[] = [
  { key: 'any', label: 'Any time' },
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
];
const HOLES: { key: Holes; label: string }[] = [
  { key: '18', label: '18 holes' },
  { key: '9', label: '9 holes' },
  { key: 'both', label: 'Both' },
];

type View2 = 'cards' | 'table';

interface Group {
  key: string;
  head: TeeTime;
  from: number;
  count: number;
}

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

/** One entry per course, cheapest first — the card deck. */
function groupByCourse(times: TeeTime[]): Group[] {
  const map = new Map<string, TeeTime[]>();
  for (const t of times) {
    const list = map.get(t.courseKey);
    if (list) list.push(t);
    else map.set(t.courseKey, [t]);
  }
  return [...map.entries()]
    .map(([key, list]) => {
      const cheapest = list.reduce((a, b) => (b.price < a.price ? b : a));
      const earliest = list.reduce((a, b) => (b.time < a.time ? b : a));
      return {
        key,
        head: { ...cheapest, time: earliest.time },
        from: cheapest.price,
        count: list.length,
      };
    })
    .sort((a, b) => a.from - b.from);
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const days = React.useMemo(() => nextDays(21), []);

  const [date, setDate] = React.useState(iso(days[1] ?? days[0]));
  const [window, setWindow] = React.useState<Window>('any');
  const [holes, setHoles] = React.useState<Holes>('18');
  const [players, setPlayers] = React.useState(2);
  const [view, setView] = React.useState<View2>('cards');

  const [result, setResult] = React.useState<SearchResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const params = React.useMemo(
    () => ({ date, window, players, holes }),
    [date, window, players, holes],
  );

  const run = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await search(params));
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong.');
      const fallback = await cachedSearch(params);
      if (fallback) setResult(fallback);
    } finally {
      setLoading(false);
    }
  }, [params]);

  // Show any cached result for these filters immediately, but don't auto-fetch:
  // one search is real load on ~45 clubs' booking systems.
  React.useEffect(() => {
    let live = true;
    setResult(null);
    setError(null);
    cachedSearch(params).then((r) => live && r && setResult(r));
    return () => {
      live = false;
    };
  }, [params]);

  const groups = React.useMemo(
    () => (result ? groupByCourse(result.teeTimes) : []),
    [result],
  );

  const tap = (fn: () => void) => () => {
    Haptics.selectionAsync().catch(() => {});
    fn();
  };

  const openCourse = (courseKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push({ pathname: '/course/[key]', params: { key: courseKey, date } });
  };

  const header = (
    <View style={{ paddingTop: insets.top + theme.space(3) }}>
      <View style={s.header}>
        <Text style={s.kicker}>SOTOGRANDE → FUENGIROLA</Text>
        <Text style={s.h1}>Tee Timer</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.dateStrip}
      >
        {days.map((d) => {
          const key = iso(d);
          const active = key === date;
          return (
            <Pressable
              key={key}
              onPress={tap(() => setDate(key))}
              style={[s.day, active && s.dayOn]}
            >
              <Text style={[s.dayName, active && s.dayTextOn]}>
                {d.toLocaleDateString('en-GB', { weekday: 'short' })}
              </Text>
              <Text style={[s.dayNum, active && s.dayTextOn]}>{d.getDate()}</Text>
              <Text style={[s.dayMon, active && s.dayTextOn]}>
                {d.toLocaleDateString('en-GB', { month: 'short' })}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={s.controls}>
        <Segmented
          options={WINDOWS}
          value={window}
          onChange={(v) => tap(() => setWindow(v as Window))()}
        />
        <Segmented
          options={HOLES}
          value={holes}
          onChange={(v) => tap(() => setHoles(v as Holes))()}
        />
        <View style={s.stepper}>
          <Pressable
            onPress={tap(() => setPlayers((p) => Math.max(1, p - 1)))}
            style={s.stepBtn}
            hitSlop={10}
            accessibilityLabel="Fewer players"
          >
            <Text style={s.stepSign}>−</Text>
          </Pressable>
          <Text style={s.stepValue}>
            {players} {players === 1 ? 'player' : 'players'}
          </Text>
          <Pressable
            onPress={tap(() => setPlayers((p) => Math.min(4, p + 1)))}
            style={s.stepBtn}
            hitSlop={10}
            accessibilityLabel="More players"
          >
            <Text style={s.stepSign}>+</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={tap(run)}
          disabled={loading}
          style={({ pressed }) => [s.cta, pressed && { opacity: 0.85 }]}
        >
          {loading ? (
            <ActivityIndicator color={c.accentInk} />
          ) : (
            <Text style={s.ctaText}>Find tee times</Text>
          )}
        </Pressable>
      </View>

      {error && (
        <View style={s.error}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {result && (
        <>
          <View style={s.summary}>
            <Stat label="Courses" value={`${result.coursesWithSpace}`} />
            <Stat label="Tee times" value={`${result.teeTimes.length}`} />
            <Stat
              label="From"
              accent
              value={
                result.teeTimes.length
                  ? `€${Math.min(...result.teeTimes.map((t) => t.price)).toFixed(0)}`
                  : '—'
              }
            />
          </View>

          <View style={s.viewBar}>
            {result.fromCache ? <Chip label="offline copy" tone="deal" /> : <View />}
            <View style={s.toggle}>
              {(['cards', 'table'] as View2[]).map((v) => (
                <Pressable
                  key={v}
                  onPress={tap(() => setView(v))}
                  style={[s.toggleItem, view === v && s.toggleItemOn]}
                  accessibilityRole="button"
                  accessibilityLabel={`${v} view`}
                >
                  <Text style={[s.toggleText, view === v && s.toggleTextOn]}>
                    {v === 'cards' ? '▦  Cards' : '☰  Table'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {view === 'table' && result.teeTimes.length > 0 && <TableHead />}
        </>
      )}
    </View>
  );

  const empty = loading ? (
    <View style={s.loading}>
      <ActivityIndicator color={c.accent} />
      <Text style={s.loadingText}>
        Checking every booking engine from Sotogrande to Fuengirola…
      </Text>
    </View>
  ) : result ? (
    <Empty
      title="Nothing free"
      body="No tee times matched. Try another day, a wider time window, or 9 holes."
    />
  ) : (
    <Empty title="Pick a day" body="Choose a date and time of day, then tap Find tee times." />
  );

  const refresh = (
    <RefreshControl refreshing={loading} onRefresh={run} tintColor={c.accent} />
  );
  const pad = { paddingBottom: insets.bottom + theme.space(8) };

  if (view === 'table') {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <FlatList
          data={result?.teeTimes ?? []}
          keyExtractor={(t, i) => `${t.courseKey}-${t.time}-${i}`}
          renderItem={({ item }) => (
            <TableRow
              t={item}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                Linking.openURL(item.bookingUrl).catch(() => {});
              }}
            />
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={pad}
          refreshControl={refresh}
          initialNumToRender={20}
          windowSize={11}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={groups}
        keyExtractor={(g) => g.key}
        renderItem={({ item }) => (
          <CourseCard group={item} onPress={() => openCourse(item.key)} />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={pad}
        refreshControl={refresh}
        // Snap so the deck settles on a card rather than mid-photo.
        snapToInterval={SNAP}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        initialNumToRender={4}
        windowSize={7}
      />
    </View>
  );
}

function CourseCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const { head, from, count } = group;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.985 }] }]}
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
            <Chip label={`${count} ${count === 1 ? 'time' : 'times'}`} />
            <Chip label={`from ${head.time}`} />
            <Chip label={`${head.holes}h`} />
          </View>
        </View>
        <Price value={from} rack={head.rackPrice} off={head.discountPct} big />
      </View>
    </Pressable>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
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
  return (
    <View style={s.seg}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[s.segItem, on && s.segItemOn]}
          >
            <Text style={[s.segText, on && s.segTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: theme.space(5), paddingBottom: theme.space(3) },
  kicker: { ...theme.font.caption, color: c.accent, marginBottom: 4 },
  h1: { ...theme.font.display, color: c.text },

  dateStrip: { paddingHorizontal: theme.space(5), gap: 8, paddingVertical: theme.space(1) },
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
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
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

  cta: {
    backgroundColor: c.accent,
    borderRadius: theme.radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: theme.space(1),
    ...theme.shadow.card,
  },
  ctaText: { ...theme.font.title, color: c.accentInk },

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

  viewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space(5),
    paddingTop: theme.space(4),
    paddingBottom: theme.space(2),
  },
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
  cardTitle: { ...theme.font.title, color: '#fff', marginTop: 3, fontSize: 21 },
  cardChips: { flexDirection: 'row', gap: 6, marginTop: 9, flexWrap: 'wrap' },

  loading: { padding: theme.space(10), alignItems: 'center', gap: theme.space(4) },
  loadingText: { ...theme.font.body, color: c.muted, textAlign: 'center', lineHeight: 21 },
});
