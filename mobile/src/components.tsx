/** Shared presentation pieces: course imagery, chips, price tags, tee-time rows. */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { clubHue, theme } from './theme';
import type { TeeTime } from './api';

const c = theme.color;

/**
 * Course imagery. 24 of the 38 clubs publish a usable photo; the rest get
 * deterministic artwork built from the club name so every card still reads as
 * a distinct place rather than an empty grey box.
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
  const hue = clubHue(seed);

  if (image && !failed) {
    return (
      <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
        <Image
          source={{ uri: image }}
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

  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      <LinearGradient
        colors={[
          `hsl(${hue}, 44%, 40%)`,
          `hsl(${(hue + 38) % 360}, 48%, 26%)`,
          `hsl(${(hue + 70) % 360}, 44%, 16%)`,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* suggestion of fairway contours */}
      <View style={[s.blob, { backgroundColor: `hsl(${hue}, 58%, 56%)`, opacity: 0.3 }]} />
      <View
        style={[
          s.blob,
          {
            backgroundColor: `hsl(${(hue + 60) % 360}, 52%, 62%)`,
            opacity: 0.22,
            left: -40,
            top: 30,
            width: 150,
            height: 150,
          },
        ]}
      />
      {scrim && (
        <LinearGradient
          colors={['transparent', 'rgba(3,10,7,0.72)']}
          locations={[0.35, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
}

export function Chip({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: 'default' | 'accent' | 'deal';
}) {
  const tint =
    tone === 'accent' ? c.accent : tone === 'deal' ? c.deal : c.muted;
  return (
    <View style={[s.chip, tone !== 'default' && { borderColor: `${tint}66` }]}>
      <Text style={[s.chipText, { color: tint }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function Price({ value, rack, off, big }: {
  value: number; rack?: number | null; off?: number | null; big?: boolean;
}) {
  const showRack = rack != null && off != null && rack > value;
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={[s.price, big && { fontSize: 26 }]}>
        €{value.toFixed(value % 1 === 0 ? 0 : 2)}
      </Text>
      {showRack && (
        <Text style={s.rack}>
          <Text style={s.strike}>€{rack!.toFixed(0)}</Text>
          <Text style={{ color: c.deal }}> −{Math.round(off!)}%</Text>
        </Text>
      )}
    </View>
  );
}

export function TeeTimeRow({ t, onPress }: { t: TeeTime; onPress: () => void }) {
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
          <Chip label={`${t.spaces} ${t.spaces === 1 ? 'space' : 'spaces'}`} />
          {t.includes.slice(0, 2).map((x) => (
            <Chip key={x} label={x} tone="accent" />
          ))}
        </View>
      </View>
      <Price value={t.price} rack={t.rackPrice} off={t.discountPct} />
    </Pressable>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyBody}>{body}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  blob: {
    position: 'absolute',
    right: -50,
    bottom: -60,
    width: 200,
    height: 200,
    borderRadius: 999,
  },
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
  empty: { padding: theme.space(8), alignItems: 'center', gap: theme.space(2) },
  emptyTitle: { ...theme.font.title, color: c.text, textAlign: 'center' },
  emptyBody: { ...theme.font.body, color: c.muted, textAlign: 'center', lineHeight: 21 },
});
