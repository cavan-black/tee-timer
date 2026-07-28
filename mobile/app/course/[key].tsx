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

import {
  cachedSearch,
  type Holes,
  type SearchResult,
  type TeeTime,
  type Window,
} from '../../src/api';
import { Chip, CourseArt, Empty, TeeTimeRow } from '../../src/components';
import { recall } from '../../src/store';
import { fill, theme, useTheme, type Palette } from '../../src/theme';


export default function CourseScreen() {
  const { colors: c } = useTheme();
  const s = useStyles(c);
  const { key, date, window, players, holes } = useLocalSearchParams<{
    key: string;
    date: string;
    window?: Window;
    players?: string;
    holes?: Holes;
  }>();
  const insets = useSafeAreaInsets();
  const [result, setResult] = React.useState<SearchResult | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    // Normally the list screen is still holding the exact result set.
    const held = recall();
    if (held?.result.teeTimes.some((t) => t.courseKey === key)) {
      setResult(held.result);
      setReady(true);
      return;
    }
    // Cold start or deep link: one targeted lookup using the filters we were
    // handed, rather than guessing across every filter combination.
    (async () => {
      const hit = await cachedSearch({
        date: date!,
        window: (window ?? 'any') as Window,
        players: Number(players ?? 1),
        holes: (holes ?? '18') as Holes,
      });
      if (!live) return;
      if (hit) setResult(hit);
      setReady(true);
    })();
    return () => {
      live = false;
    };
  }, [key, date, window, players, holes]);

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
        contentContainerStyle={{ paddingBottom: insets.bottom + theme.space(24) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.hero}>
          {/* Hero draws its own scrim; this only blends the base into the page. */}
          <CourseArt image={head.image} seed={head.club} style={fill} radius={0} scrim={false} />
          <LinearGradient
            colors={['rgba(3,10,7,0.45)', 'transparent', 'rgba(3,10,7,0.55)', c.bg]}
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
              <Chip
                label={day.toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              />
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
        <View style={s.dockRow}>
          <Pressable
            onPress={() => open(head.bookingUrl)}
            style={({ pressed }) => [s.cta, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel={`Book online at ${head.club}`}
          >
            <Text style={s.ctaText}>Book online</Text>
          </Pressable>
          {/* Some tee sheets are easier sorted by voice, and not every club
              publishes a number — so this only appears when we have one. */}
          {head.phone && (
            <Pressable
              onPress={() => open(`tel:${head.phone!.replace(/\s/g, '')}`)}
              style={({ pressed }) => [s.callButton, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel={`Call ${head.club} on ${head.phone}`}
            >
              <Text style={s.callText}>Call</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function Back({ onPress }: { onPress: () => void }) {
  const { colors: c } = useTheme();
  const s = useStyles(c);
  return (
    <Pressable onPress={onPress} style={s.back} hitSlop={12} accessibilityLabel="Back">
      <Text style={s.backGlyph}>‹</Text>
    </Pressable>
  );
}


function useStyles(c: Palette) {
  return React.useMemo(() => makeStyles(c), [c]);
}

const makeStyles = (c: Palette) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 340, justifyContent: 'space-between' },
  heroText: { padding: theme.space(5) },
  area: { ...theme.font.caption, color: c.accent },
  title: { ...theme.font.display, color: c.onImage, marginTop: 4 },
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
    backgroundColor: c.bg,
    borderTopWidth: 1,
    borderTopColor: c.line,
  },
  dockRow: { flexDirection: 'row', gap: theme.space(2) },
  cta: {
    flex: 1,
    backgroundColor: c.accent,
    borderRadius: theme.radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ctaText: { ...theme.font.title, color: c.accentInk },
  callButton: {
    paddingVertical: 15,
    paddingHorizontal: theme.space(7),
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: c.lineStrong,
    alignItems: 'center',
  },
  callText: { ...theme.font.title, color: c.text },
});
