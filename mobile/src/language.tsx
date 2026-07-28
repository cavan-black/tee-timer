/**
 * Language control for the header.
 *
 * Sits next to the help and theme buttons and matches them: no fill, no
 * border, muted text — these are all secondary to the search. Tapping drops a
 * small card under the button rather than pushing a whole screen, since there
 * are only three choices.
 */
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LANGS, useI18n, type Lang } from './i18n';
import { theme, useTheme, type Palette } from './theme';

export function LanguageButton() {
  const { colors: c } = useTheme();
  const s = useStyles(c);
  const { lang, setLang, t } = useI18n();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = React.useState(false);

  const current = LANGS.find((l) => l.key === lang) ?? LANGS[0];

  const choose = (next: Lang) => {
    Haptics.selectionAsync().catch(() => {});
    setLang(next);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          setOpen(true);
        }}
        style={s.button}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t('a11y.language')}
      >
        <Text style={s.code}>{current.short}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        {/* Backdrop is the dismiss target, so the card needs no close button. */}
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <View style={[s.card, { marginTop: insets.top + theme.space(14) }]}>
            {LANGS.map((l, i) => {
              const on = l.key === lang;
              return (
                <Pressable
                  key={l.key}
                  onPress={() => choose(l.key)}
                  style={({ pressed }) => [
                    s.item,
                    i > 0 && s.itemDivided,
                    pressed && { backgroundColor: c.surfaceHi },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[s.itemCode, on && { color: c.accent }]}>{l.short}</Text>
                  <Text style={[s.itemLabel, on && { color: c.text }]}>{l.label}</Text>
                  <Text style={[s.tick, !on && { opacity: 0 }]}>✓</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function useStyles(c: Palette) {
  return React.useMemo(() => makeStyles(c), [c]);
}

const makeStyles = (c: Palette) => StyleSheet.create({
  button: {
    height: 38,
    minWidth: 38,
    paddingHorizontal: 4,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  code: { ...theme.font.caption, fontSize: 13, letterSpacing: 0.4, color: c.muted },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'flex-end',
  },
  card: {
    marginRight: theme.space(5),
    minWidth: 186,
    backgroundColor: c.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: c.line,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space(3),
    paddingVertical: 13,
    paddingHorizontal: theme.space(4),
  },
  itemDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
  itemCode: { ...theme.font.caption, fontSize: 12, color: c.faint, width: 24 },
  itemLabel: { ...theme.font.body, color: c.muted, flex: 1 },
  tick: { ...theme.font.label, color: c.accent },
});
