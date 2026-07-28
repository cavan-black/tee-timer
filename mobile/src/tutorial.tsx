/**
 * First-run walkthrough.
 *
 * Two things are not obvious from the interface: that a search really is
 * reading ~45 clubs live and so takes a moment, and that tapping through ends
 * at the club's own booking page rather than booking anything here. Both are
 * worth saying once, plainly.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { theme, useTheme, type Palette } from './theme';

const SEEN_KEY = 'teetimer:tutorialSeen';

const STEPS: { icon: string; title: string; body: string }[] = [
  {
    icon: '1',
    title: 'Pick a day and a time',
    body: 'Choose a date, then Any time, Morning or Afternoon. Set how many '
      + 'of you are playing and whether you want 18 or 9 holes.',
  },
  {
    icon: '2',
    title: 'Narrow it down if you like',
    body: 'The area chips limit the search to one stretch of coast — Marbella, '
      + 'Estepona, Mijas. Fewer clubs also means a much faster search.',
  },
  {
    icon: '3',
    title: 'Tap Find tee times',
    body: 'This reads every club\'s own booking system live, so the whole coast '
      + 'takes around fifteen seconds. One area takes a couple. You can cancel '
      + 'at any point to change your mind.',
  },
  {
    icon: '4',
    title: 'Cards or table',
    body: 'Cards show one photo per course, cheapest first. Table lists every '
      + 'tee time on the coast at once, by time or by price.',
  },
  {
    icon: '→',
    title: 'Tapping a club takes you to their booking page',
    body: 'Open a course to see its full tee sheet, then tap a time to go '
      + 'straight to that club\'s own site to book it. Tee Timer never takes '
      + 'payment and never holds a reservation — it only finds the prices.',
  },
];

export function useTutorial() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    AsyncStorage.getItem(SEEN_KEY)
      .then((seen) => {
        if (live && !seen) setVisible(true);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const close = React.useCallback(() => {
    setVisible(false);
    AsyncStorage.setItem(SEEN_KEY, '1').catch(() => {});
  }, []);

  /** Re-open from the help button; does not touch the seen flag. */
  const open = React.useCallback(() => setVisible(true), []);

  return { visible, open, close };
}

export function Tutorial({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors: c } = useTheme();
  const s = React.useMemo(() => makeStyles(c), [c]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.grabber} />
          <Text style={s.kicker}>COSTA DEL SOL</Text>
          <Text style={s.title}>Every tee time on the coast</Text>
          <Text style={s.lede}>
            Live prices from 38 clubs between Sotogrande and Fuengirola, read
            straight from each club's own booking system.
          </Text>

          <ScrollView style={s.steps} showsVerticalScrollIndicator={false}>
            {STEPS.map((step) => (
              <View key={step.title} style={s.step}>
                <View style={s.bullet}>
                  <Text style={s.bulletText}>{step.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.stepTitle}>{step.title}</Text>
                  <Text style={s.stepBody}>{step.body}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [s.cta, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Text style={s.ctaText}>Let's play</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: theme.space(6),
    paddingTop: theme.space(3),
    paddingBottom: theme.space(8),
    maxHeight: '88%',
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.lineStrong,
    marginBottom: theme.space(5),
  },
  kicker: { ...theme.font.caption, color: c.accent },
  title: { ...theme.font.display, color: c.text, marginTop: 4, fontSize: 26 },
  lede: { ...theme.font.body, color: c.muted, lineHeight: 21, marginTop: theme.space(2) },

  steps: { marginTop: theme.space(5) },
  step: { flexDirection: 'row', gap: theme.space(3), marginBottom: theme.space(5) },
  bullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.surfaceHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: { ...theme.font.label, color: c.accent },
  stepTitle: { ...theme.font.body, color: c.text, fontWeight: '700' },
  stepBody: { ...theme.font.body, color: c.muted, lineHeight: 20, marginTop: 3, fontSize: 14 },

  cta: {
    backgroundColor: c.accent,
    borderRadius: theme.radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: theme.space(2),
  },
  ctaText: { ...theme.font.title, color: c.accentInk },
});
