/** Search + results. One screen: set the day and time, see the courses. */
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cachedSearch, search, type Holes, type SearchResult, type TeeTime, type Window } from '../src/api';
import { Chip, CourseArt, Empty, Price } from '../src/components';
import { fill, theme } from '../src/theme';

const c = theme.color;
const WINDOWS: { key: Window; label: string }[] = [
  { key: 'any', label: 'Any time' },
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
];
const HOLES: { key: Holes; label: string }[] = [
  { key: '18', label: '18' },
  { key: '9', label: '9' },
  { key: 'both', label: 'Both' },
];

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

/** Group the flat tee-time list into one section per course, cheapest first. */
function byCourse(times: TeeTime[]) {
  const map = new Map<string, TeeTime[]>();
  for (const t of times) {
    const list = map.get(t.courseKey);
    if (list) list.push(t);
    else map.set(t.courseKey, [t]);
  }
  return [...map.values()]
    .map((list) => {
      const sorted = [...list].sort((a, b) => a.price - b.price);
      return { head: sorted[0], from: sorted[0].price, count: list.length, data: [list[0]] };
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

  // Show any cached result for these filters immediately; don't auto-fetch,
  // since a search hammers ~45 booking engines.
  React.useEffect(() => {
    let live = true;
    setResult(null);
    setError(null);
    cachedSearch(params).then((r) => live && r && setResult(r));
    return () => {
      live = false;
    };
  }, [params]);

  const sections = React.useMemo(
    () => (result ? byCourse(result.teeTimes) : []),
    [result],
  );

  const tap = (fn: () => void) => () => {
    Haptics.selectionAsync().catch(() => {});
    fn();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SectionList
        sections={sections.map((s) => ({ ...s, title: s.head.courseKey }))}
        keyExtractor={(item, i) => `${item.courseKey}-${i}`}
        contentContainerStyle={{ paddingBottom: insets.bottom + theme.space(8) }}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={run} tintColor={c.accent} />
        }
        ListHeaderComponent={
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
                options={WINDOWS.map((w) => ({ key: w.key, label: w.label }))}
                value={window}
                onChange={(v) => tap(() => setWindow(v as Window))()}
              />
              <Segmented
                options={HOLES.map((h) => ({ key: h.key, label: `${h.label} holes` }))}
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
              <View style={s.summary}>
                <Stat label="Courses" value={`${result.coursesWithSpace}`} />
                <Stat
                  label="Tee times"
                  value={`${result.teeTimes.length}`}
                />
                <Stat
                  label="From"
                  value={
                    result.teeTimes.length
                      ? `€${Math.min(...result.teeTimes.map((t) => t.price)).toFixed(0)}`
                      : '—'
                  }
                  accent
                />
                {result.fromCache && <Chip label="offline copy" tone="deal" />}
              </View>
            )}
          </View>
        }
        renderSectionHeader={() => null}
        renderItem={({ section }) => {
          const meta = sections.find((x) => x.head.courseKey === section.title)!;
          return <CourseCard item={meta} date={date} />;
        }}
        ListEmptyComponent={
          loading ? (
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
            <Empty
              title="Pick a day"
              body="Choose a date and time of day, then tap Find tee times."
            />
          )
        }
      />
    </View>
  );
}

function CourseCard({
  item,
  date,
}: {
  item: { head: TeeTime; from: number; count: number };
  date: string;
}) {
  const { head, from, count } = item;
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        router.push({ pathname: '/course/[key]', params: { key: head.courseKey, date } });
      }}
      style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.985 }] }]}
    >
      {/* CourseArt already lays down the scrim; a second one turns photos black. */}
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
  compact,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  compact?: boolean;
}) {
  return (
    <View style={[s.seg, compact && s.segCompact]}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            // Compact segments size to their label; full-width ones share the row.
            style={[s.segItem, compact && s.segItemCompact, on && s.segItemOn]}
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

  controls: { paddingHorizontal: theme.space(5), paddingTop: theme.space(4), gap: theme.space(3) },
  controlRow: { flexDirection: 'row', gap: theme.space(3), alignItems: 'center' },
  seg: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderRadius: theme.radius.pill,
    padding: 4,
    flex: 1,
  },
  segItem: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
  },
  segCompact: { flex: 0, flexGrow: 0, flexShrink: 0 },
  segItemCompact: { flex: 0, minWidth: 46, paddingHorizontal: 14 },
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
    alignItems: 'center',
    paddingHorizontal: theme.space(5),
    paddingTop: theme.space(5),
    paddingBottom: theme.space(1),
  },
  stat: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: theme.radius.md,
    padding: theme.space(3),
  },
  statLabel: { ...theme.font.caption, color: c.faint },
  statValue: { ...theme.font.title, color: c.text, marginTop: 2 },

  card: {
    height: 208,
    marginHorizontal: theme.space(5),
    marginTop: theme.space(3),
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
