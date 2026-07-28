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

import { useI18n } from './i18n';
import { theme, useTheme, type Palette } from './theme';


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
  const { colors: c } = useTheme();
  const s = useStyles(c);
  return <View style={[s.bar, { width: w as number, height: h, borderRadius: h / 2 }, style]} />;
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  const { colors: c } = useTheme();
  const s = useStyles(c);
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
  const { colors: c } = useTheme();
  const s = useStyles(c);
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

/**
 * Roughly how long this search will take. Measured: ~2s of fixed overhead plus
 * ~350ms per course, so five courses land in about 4s and the whole corridor
 * in about 17s.
 */
function estimateMs(courses: number) {
  return 2000 + Math.max(courses, 1) * 350;
}

/**
 * Progress bar for the search.
 *
 * The API answers once, at the end — there is no per-course progress to
 * report. So this is an *estimate*: it eases toward the measured typical
 * duration and deliberately stalls at 92%, because the one thing a progress
 * bar must never do is sit at 100% while the user is still waiting. It
 * completes only when the data actually arrives.
 */
function ProgressBar({
  courses,
  done,
  onFinished,
}: {
  courses: number;
  /** Data has arrived — run to the end. */
  done?: boolean;
  onFinished?: () => void;
}) {
  const { colors: c } = useTheme();
  const s = useStyles(c);
  const grow = React.useRef(new Animated.Value(0)).current;
  const sheen = React.useRef(new Animated.Value(0)).current;
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    Animated.timing(grow, {
      toValue: 0.92,
      duration: estimateMs(courses),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // animating width, not a transform
    }).start();
  }, [grow, courses]);

  React.useEffect(() => {
    if (!done) return;
    const finish = Animated.timing(grow, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    });
    finish.start(({ finished }) => {
      if (finished) onFinished?.();
    });
    // The results are gated behind this callback, so never let a stopped or
    // dropped animation strand the caller in a permanent loading state.
    const safety = setTimeout(() => onFinished?.(), 900);
    return () => {
      finish.stop();
      clearTimeout(safety);
    };
  }, [done, grow, onFinished]);

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(sheen, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [sheen]);

  return (
    <View style={s.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View
        style={[
          s.fill,
          { width: grow.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      >
        {width > 0 && (
          <Animated.View
            style={[
              s.sheen,
              {
                transform: [
                  {
                    translateX: sheen.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-90, width],
                    }),
                  },
                ],
              },
            ]}
          />
        )}
      </Animated.View>
    </View>
  );
}

/** Explains the wait while the search runs, rather than just enduring it. */
export function SearchProgress({
  courses,
  done,
  onFinished,
}: {
  courses: number;
  done?: boolean;
  onFinished?: () => void;
}) {
  const { colors: c } = useTheme();
  const { t } = useI18n();
  const s = useStyles(c);
  return (
    <View style={s.progress}>
      <Text style={s.title}>
        {done ? t('progress.almost') : t('progress.checking', { count: courses })}
      </Text>
      <Text style={s.body}>{t('progress.body')}</Text>
      <ProgressBar courses={courses} done={done} onFinished={onFinished} />
    </View>
  );
}

function useStyles(c: Palette) {
  return React.useMemo(() => makeStyles(c), [c]);
}

const makeStyles = (c: Palette) => StyleSheet.create({
  bar: { backgroundColor: c.placeholder },

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
  track: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: c.placeholder,
    marginTop: theme.space(5),
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: c.accent,
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 90,
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
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
