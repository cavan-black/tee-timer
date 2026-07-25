/** Every tee time at one course, with a hero and a link out to book. */
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cachedSearch, type SearchResult, type TeeTime } from '../../src/api';
import { Chip, CourseArt, Empty, TeeTimeRow } from '../../src/components';
import { fill, theme } from '../../src/theme';

const c = theme.color;

export default function CourseScreen() {
  const { key, date } = useLocalSearchParams<{ key: string; date: string }>();
  const insets = useSafeAreaInsets();
  const [result, setResult] = React.useState<SearchResult | null>(null);
  const [ready, setReady] = React.useState(false);

  // The list screen has already cached this exact search, so reuse it rather
  // than re-scraping 45 booking engines to show one course.
  React.useEffect(() => {
    let live = true;
    (async () => {
      for (const w of ['any', 'morning', 'afternoon'] as const) {
        for (const h of ['18', '9', 'both'] as const) {
          for (const p of [1, 2, 3, 4]) {
            const hit = await cachedSearch({ date: date!, window: w, players: p, holes: h });
            if (hit?.teeTimes.some((t) => t.courseKey === key)) {
              if (live) {
                setResult(hit);
                setReady(true);
              }
              return;
            }
          }
        }
      }
      if (live) setReady(true);
    })();
    return () => {
      live = false;
    };
  }, [key, date]);

  const times = React.useMemo(
    () => (result?.teeTimes ?? []).filter((t) => t.courseKey === key),
    [result, key],
  );
  const head: TeeTime | undefined = times[0];

  const open = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Linking.openURL(url).catch(() => {});
  };

  if (!ready) {
    return (
      <View style={[s.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  if (!head) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 40 }}>
        <Back onPress={() => router.back()} />
        <Empty title="No longer listed" body="Run the search again to refresh this course." />
      </View>
    );
  }

  const cheapest = Math.min(...times.map((t) => t.price));
  const day = new Date(`${date}T12:00:00`);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + theme.space(10) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.hero}>
          {/* Hero draws its own scrim; this only blends the base into the page. */}
          <CourseArt image={head.image} seed={head.club} style={fill} radius={0} scrim={false} />
          <LinearGradient
            colors={['rgba(7,18,13,0.45)', 'transparent', 'rgba(7,18,13,0.55)', c.bg]}
            locations={[0, 0.35, 0.78, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={{ paddingTop: insets.top + theme.space(2) }}>
            <Back onPress={() => router.back()} />
          </View>
          <View style={s.heroText}>
            <Text style={s.area}>{head.area.toUpperCase()}</Text>
            <Text style={s.title}>{head.label}</Text>
            <View style={s.chips}>
              <Chip label={day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} />
              <Chip label={`${times.length} tee times`} />
              <Chip label={`from €${cheapest.toFixed(0)}`} tone="accent" />
            </View>
          </View>
        </View>

        <View style={s.list}>
          {times.map((t, i) => (
            <TeeTimeRow key={`${t.time}-${t.rate}-${i}`} t={t} onPress={() => open(t.bookingUrl)} />
          ))}
        </View>

        <Text style={s.footnote}>
          Prices are the club's own online rate, per player. Tapping a tee time opens the
          club's booking page — Tee Timer never takes payment or holds a reservation.
        </Text>
      </ScrollView>

      <View style={[s.dock, { paddingBottom: insets.bottom + theme.space(3) }]}>
        <Pressable
          onPress={() => open(head.bookingUrl)}
          style={({ pressed }) => [s.cta, pressed && { opacity: 0.85 }]}
        >
          <Text style={s.ctaText}>Book at {head.club}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Back({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.back} hitSlop={12} accessibilityLabel="Back">
      <Text style={s.backGlyph}>‹</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 340, justifyContent: 'space-between' },
  heroText: { padding: theme.space(5) },
  area: { ...theme.font.caption, color: c.accent },
  title: { ...theme.font.display, color: '#fff', marginTop: 4 },
  chips: { flexDirection: 'row', gap: 6, marginTop: theme.space(3), flexWrap: 'wrap' },
  back: {
    marginLeft: theme.space(4),
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: { color: '#fff', fontSize: 30, lineHeight: 32, marginTop: -3 },
  list: { paddingHorizontal: theme.space(5), gap: theme.space(2), marginTop: theme.space(1) },
  footnote: {
    ...theme.font.caption,
    fontWeight: '500',
    letterSpacing: 0,
    color: c.faint,
    lineHeight: 17,
    paddingHorizontal: theme.space(5),
    paddingTop: theme.space(6),
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.space(5),
    paddingTop: theme.space(3),
    backgroundColor: 'rgba(7,18,13,0.94)',
    borderTopWidth: 1,
    borderTopColor: c.line,
  },
  cta: {
    backgroundColor: c.accent,
    borderRadius: theme.radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ctaText: { ...theme.font.title, color: c.accentInk },
});
