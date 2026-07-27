/**
 * Loading state for a search.
 *
 * A whole-corridor search takes ~15s because it really is querying 45 booking
 * engines. A bare spinner for that long reads as broken, so we show the shape
 * of the result instead, plus an honest elapsed counter. There's deliberately
 * no progress bar: the API returns one response at the end, so any percentage
 * would be invented.
 */
import React from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { theme } from './theme';

const c = theme.color;

/** Shared pulse so every placeholder breathes in step rather than shimmering
 *  independently, which looks noisy. */
function usePulse() {
  const value = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value]);
  return value.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });
}

function Bar({ w, h = 12, style }: { w: number | string; h?: number; style?: object }) {
  return <View style={[s.bar, { width: w as number, height: h, borderRadius: h / 2 }, style]} />;
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  const opacity = usePulse();
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <Animated.View key={i} style={[s.card, { opacity }]}>
          <View style={s.cardBody}>
            <Bar w={72} h={9} />
            <Bar w={190} h={19} style={{ marginTop: 8 }} />
            <View style={s.row}>
              <Bar w={58} h={16} />
              <Bar w={72} h={16} />
              <Bar w={34} h={16} />
            </View>
          </View>
          <Bar w={64} h={22} style={{ position: 'absolute', right: 16, bottom: 18 }} />
        </Animated.View>
      ))}
    </View>
  );
}

export function SkeletonRows({ count = 8 }: { count?: number }) {
  const opacity = usePulse();
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <Animated.View key={i} style={[s.tableRow, { opacity }]}>
          <Bar w={40} h={14} />
          <View style={{ flex: 1 }}>
            <Bar w={'70%'} h={12} />
            <Bar w={'45%'} h={9} style={{ marginTop: 6 }} />
          </View>
          <Bar w={38} h={14} />
        </Animated.View>
      ))}
    </View>
  );
}

/** Counts up while the search runs, so a long wait still feels alive. */
export function SearchProgress({ courses }: { courses: number }) {
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={s.progress}>
      <View style={s.dotRow}>
        <Dot delay={0} />
        <Dot delay={160} />
        <Dot delay={320} />
      </View>
      <Text style={s.title}>
        Checking {courses} course{courses === 1 ? '' : 's'}
      </Text>
      <Text style={s.body}>
        Reading each club's own booking system — nothing is cached, so these are
        the prices they're selling right now.
      </Text>
      <Text style={s.timer}>{elapsed}s</Text>
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const v = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 420, useNativeDriver: true }),
        Animated.delay(480 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay]);

  return (
    <Animated.View
      style={[
        s.dot,
        {
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
          ],
        },
      ]}
    />
  );
}

const s = StyleSheet.create({
  bar: { backgroundColor: 'rgba(255,255,255,0.10)' },

  card: {
    height: 208,
    marginHorizontal: theme.space(5),
    marginTop: theme.space(3),
    borderRadius: theme.radius.lg,
    backgroundColor: c.surface,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  cardBody: { padding: theme.space(4) },
  row: { flexDirection: 'row', gap: 6, marginTop: 10 },

  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space(3),
    paddingVertical: 13,
    paddingHorizontal: theme.space(4),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.line,
  },

  progress: {
    alignItems: 'center',
    paddingHorizontal: theme.space(8),
    paddingTop: theme.space(7),
    paddingBottom: theme.space(2),
  },
  dotRow: { flexDirection: 'row', gap: 7, marginBottom: theme.space(4) },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent },
  title: { ...theme.font.title, color: c.text },
  body: {
    ...theme.font.body,
    color: c.muted,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: theme.space(2),
  },
  timer: {
    ...theme.font.caption,
    color: c.faint,
    marginTop: theme.space(3),
    fontVariant: ['tabular-nums'],
  },
});
