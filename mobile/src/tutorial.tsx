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

import { useI18n } from './i18n';
import { theme, useTheme, type Palette } from './theme';

const SEEN_KEY = 'teetimer:tutorialSeen';

/** Copy lives in ./i18n; this is just the ordering and the bullet glyphs. */
const STEPS = [
  { icon: '1', key: 'tut.1' },
  { icon: '2', key: 'tut.2' },
  { icon: '3', key: 'tut.3' },
  { icon: '4', key: 'tut.4' },
  { icon: '→', key: 'tut.5' },
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
  const { t } = useI18n();
  const s = React.useMemo(() => makeStyles(c), [c]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.grabber} />
          <Text style={s.kicker}>{t('app.kicker')}</Text>
          <Text style={s.title}>{t('tut.title')}</Text>
          <Text style={s.lede}>{t('tut.lede')}</Text>

          <ScrollView style={s.steps} showsVerticalScrollIndicator={false}>
            {STEPS.map((step) => (
              <View key={step.key} style={s.step}>
                <View style={s.bullet}>
                  <Text style={s.bulletText}>{step.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.stepTitle}>{t(`${step.key}.title`)}</Text>
                  <Text style={s.stepBody}>{t(`${step.key}.body`)}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [s.cta, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Text style={s.ctaText}>{t('tut.cta')}</Text>
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
