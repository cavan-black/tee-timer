/** Shared presentation pieces: course imagery, chips, price tags, tee-time rows. */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { imageUrl, type TeeTime } from './api';
import { GeneratedCourse } from './courseart';
import { useI18n } from './i18n';
import { palettes, theme, useTheme, type Palette } from './theme';

/**
 * Course imagery, with the drawn scene as a fallback — used both when a club
 * publishes no photo and when a photo fails to load.
 */
export function CourseArt({
  image,
  seed,
  style,
  radius = theme.radius.md,
  scrim = true,
}: {
  image?: string | null;
  seed: string;
  style?: ViewStyle;
  radius?: number;
  /** Darken the lower half so overlaid text stays legible. Only one scrim
   *  should ever be applied — stacking them crushes the photo to black. */
  scrim?: boolean;
}) {
  const [failed, setFailed] = React.useState(false);
  const uri = imageUrl(image);

  if (uri && !failed) {
    return (
      <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={260}
          cachePolicy="memory-disk"
          onError={() => setFailed(true)}
        />
        {scrim && (
          <LinearGradient
            colors={['transparent', 'rgba(3,10,7,0.30)', 'rgba(3,10,7,0.88)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
        )}
      </View>
    );
  }

  return <GeneratedCourse seed={seed} style={style} radius={radius} />;
}

export function Chip({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: 'default' | 'accent' | 'deal';
}) {
  const { colors: c } = useTheme();
  const s = useStyles(c);
  const tint = tone === 'accent' ? c.accent : tone === 'deal' ? c.deal : c.muted;
  return (
    <View style={[s.chip, tone !== 'default' && { borderColor: `${tint}66` }]}>
      <Text style={[s.chipText, { color: tint }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function Price({ value, rack, off, big, onImage }: {
  value: number; rack?: number | null; off?: number | null; big?: boolean;
  /** Sitting over course photography, which is dark under the scrim in both
   *  themes — so use the bright green, not light mode's darker one. */
  onImage?: boolean;
}) {
  const { colors: c } = useTheme();
  const s = useStyles(c);
  const showRack = rack != null && off != null && rack > value;
  const tint = onImage ? palettes.dark.accent : c.accent;
  const deal = onImage ? palettes.dark.deal : c.deal;
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={[s.price, { color: tint }, big && { fontSize: 26 }]}>
        €{value.toFixed(value % 1 === 0 ? 0 : 2)}
      </Text>
      {showRack && (
        <Text style={[s.rack, onImage && { color: 'rgba(255,255,255,0.7)' }]}>
          <Text style={s.strike}>€{rack!.toFixed(0)}</Text>
          <Text style={{ color: deal }}> −{Math.round(off!)}%</Text>
        </Text>
      )}
    </View>
  );
}

export function TeeTimeRow({ t, onPress }: { t: TeeTime; onPress: () => void }) {
  const { colors: c } = useTheme();
  const { t: tr } = useI18n();
  const s = useStyles(c);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && { backgroundColor: c.surfaceHi }]}
      accessibilityRole="button"
      accessibilityLabel={`${t.time} at ${t.label}, €${t.price}, ${t.rate}`}
    >
      <Text style={s.time}>{t.time}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowTitle} numberOfLines={1}>
          {t.rate}
        </Text>
        <View style={s.metaRow}>
          <Chip label={`${t.holes}h`} />
          <Chip label={tr('spaces', { count: t.spaces })} />
          {t.includes.slice(0, 2).map((x) => (
            <Chip key={x} label={x} tone="accent" />
          ))}
        </View>
      </View>
      <Price value={t.price} rack={t.rackPrice} off={t.discountPct} />
    </Pressable>
  );
}

/** Dense row for the table view: scan a lot of tee times quickly. */
export function TableRow({
  t,
  onPress,
  showCourse = true,
}: {
  t: TeeTime;
  onPress: () => void;
  showCourse?: boolean;
}) {
  const { colors: c } = useTheme();
  const s = useStyles(c);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.tRow, pressed && { backgroundColor: c.surfaceHi }]}
      accessibilityRole="button"
      accessibilityLabel={`${t.time}, ${t.label}, €${t.price}`}
    >
      <Text style={s.tTime}>{t.time}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        {showCourse && (
          <Text style={s.tClub} numberOfLines={1}>
            {t.label}
          </Text>
        )}
        <Text style={s.tRate} numberOfLines={1}>
          {t.rate}
        </Text>
      </View>
      <Text style={s.tSpaces}>{t.spaces}p</Text>
      <Text style={s.tPrice}>€{t.price.toFixed(0)}</Text>
    </Pressable>
  );
}

/** Column captions for the table view. */
export function TableHead() {
  const { colors: c } = useTheme();
  const { t } = useI18n();
  const s = useStyles(c);
  return (
    <View style={s.tHead}>
      <Text style={[s.tHeadCell, { width: 52 }]}>{t('table.tee')}</Text>
      <Text style={[s.tHeadCell, { flex: 1 }]}>{t('table.course')}</Text>
      <Text style={[s.tHeadCell, { width: 34, textAlign: 'right' }]}>{t('table.max')}</Text>
      <Text style={[s.tHeadCell, { width: 56, textAlign: 'right' }]}>{t('table.price')}</Text>
    </View>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  const { colors: c } = useTheme();
  const s = useStyles(c);
  return (
    <View style={s.empty}>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyBody}>{body}</Text>
    </View>
  );
}

function useStyles(c: Palette) {
  return React.useMemo(() => makeStyles(c), [c]);
}

const makeStyles = (c: Palette) => StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipText: { ...theme.font.caption, fontSize: 10.5, letterSpacing: 0.2 },
  price: { ...theme.font.title, color: c.accent, fontVariant: ['tabular-nums'] },
  rack: { ...theme.font.caption, color: c.faint, marginTop: 1 },
  strike: { textDecorationLine: 'line-through' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space(3),
    paddingVertical: theme.space(3),
    paddingHorizontal: theme.space(4),
    backgroundColor: c.surface,
    borderRadius: theme.radius.md,
  },
  time: {
    ...theme.font.title,
    color: c.text,
    width: 58,
    fontVariant: ['tabular-nums'],
  },
  rowTitle: { ...theme.font.body, color: c.text },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },

  tHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space(2),
    paddingHorizontal: theme.space(4),
    paddingBottom: 6,
  },
  tHeadCell: { ...theme.font.caption, fontSize: 10, color: c.faint },
  tRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space(2),
    paddingVertical: 10,
    paddingHorizontal: theme.space(4),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.line,
  },
  tTime: {
    ...theme.font.body,
    color: c.text,
    width: 52,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  tClub: { ...theme.font.label, color: c.text },
  tRate: { ...theme.font.caption, fontWeight: '500', letterSpacing: 0, color: c.muted, marginTop: 1 },
  tSpaces: { ...theme.font.caption, color: c.faint, width: 34, textAlign: 'right' },
  tPrice: {
    ...theme.font.label,
    color: c.accent,
    width: 56,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  empty: { padding: theme.space(8), alignItems: 'center', gap: theme.space(2) },
  emptyTitle: { ...theme.font.title, color: c.text, textAlign: 'center' },
  emptyBody: { ...theme.font.body, color: c.muted, textAlign: 'center', lineHeight: 21 },
});
