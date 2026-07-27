/**
 * Generated course artwork.
 *
 * Not every club publishes a usable photo of its course, and an empty card
 * looks broken. Rather than a flat gradient, each of those gets a drawn golf
 * scene — sky, rolling hills, fairway, bunker, green and pin — deterministically
 * seeded from the club name, so a course always looks like itself and no two
 * neighbouring cards look alike.
 */
import React from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

const W = 400;
const H = 220;

/** Small deterministic PRNG so one club name always yields the same scene. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

export function GeneratedCourse({
  seed,
  style,
  radius = 0,
}: {
  seed: string;
  style?: ViewStyle;
  radius?: number;
}) {
  const scene = React.useMemo(() => {
    const rnd = seeded(seed);

    // Time of day drives the sky. The land stays green in every mood -- a
    // tinted, translucent landmass over a warm sky just reads as brown.
    const mood = rnd();
    const sky =
      mood < 0.34
        ? ['#0d3f5c', '#2f7f97', '#8ec9c2'] // clear morning
        : mood < 0.70
          ? ['#12557a', '#3f93bb', '#adddde'] // bright midday
          : ['#123a5e', '#c8794a', '#f0b970']; // late sun

    const grassTop = 22 + rnd() * 18; // hue of the turf
    const hillY = 96 + rnd() * 26;
    const bend = rnd();
    const flagX = 250 + rnd() * 90;
    const sunX = 60 + rnd() * 280;
    const bunkerX = 70 + rnd() * 120;
    // Canopies peek just above the ridge rather than floating on it.
    const trees = Array.from({ length: 4 + Math.floor(rnd() * 4) }, () => ({
      x: rnd() * W,
      r: 12 + rnd() * 13,
      y: hillY - 12 - rnd() * 10,
    }));

    return { sky, grassTop, hillY, bend, flagX, sunX, bunkerX, trees, mood };
  }, [seed]);

  const { sky, grassTop, hillY, bend, flagX, sunX, bunkerX, trees, mood } = scene;
  const g = (l: number) => `hsl(${106 + grassTop * 0.4}, ${34 + grassTop * 0.5}%, ${l}%)`;

  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      {/* Anchored to the bottom: on a card wider than the artwork the crop
          then keeps the fairway and green rather than a band of empty sky. */}
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        <Defs>
          <SvgGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sky[0]} />
            <Stop offset="0.62" stopColor={sky[1]} />
            <Stop offset="1" stopColor={sky[2]} />
          </SvgGradient>
          <SvgGradient id="turf" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={g(34)} />
            <Stop offset="1" stopColor={g(14)} />
          </SvgGradient>
          <SvgGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.45" stopColor="#030a07" stopOpacity="0" />
            <Stop offset="1" stopColor="#030a07" stopOpacity="0.86" />
          </SvgGradient>
        </Defs>

        <Rect width={W} height={H} fill="url(#sky)" />
        <Circle cx={sunX} cy={hillY - 46} r={mood > 0.72 ? 22 : 15} fill="#fff" opacity={0.5} />

        {/* tree line, drawn before the ridge so the canopies sit behind it */}
        {trees.map((t, i) => (
          <Circle key={i} cx={t.x} cy={t.y} r={t.r} fill={g(15)} />
        ))}

        {/* far ridge — opaque, so the sky never bleeds through as brown */}
        <Path
          d={`M0 ${hillY} Q ${W * 0.28} ${hillY - 30 - bend * 14} ${W * 0.56} ${hillY - 4}
              T ${W} ${hillY - 16} L ${W} ${H} L 0 ${H} Z`}
          fill={g(22)}
        />

        {/* fairway sweeping to the green */}
        <Path
          d={`M0 ${H} L ${W} ${H} L ${W} ${hillY + 24}
              Q ${W * 0.62} ${hillY + 10 + bend * 18} ${W * 0.34} ${hillY + 46}
              Q ${W * 0.12} ${hillY + 74} 0 ${hillY + 58} Z`}
          fill="url(#turf)"
        />

        <Ellipse cx={bunkerX} cy={H - 44} rx={38} ry={13} fill="#e8dcc0" opacity={0.85} />
        <Ellipse cx={flagX} cy={H - 66} rx={54} ry={19} fill={g(40)} opacity={0.95} />
        <Circle cx={flagX + 4} cy={H - 68} r={2.6} fill={g(9)} />

        {/* pin */}
        <Rect x={flagX + 3} y={H - 112} width={1.8} height={46} fill="#f4f8f5" />
        <Path
          d={`M${flagX + 4.8} ${H - 112} L${flagX + 34} ${H - 103} L${flagX + 4.8} ${H - 94} Z`}
          fill="#ef4444"
        />

        <Rect width={W} height={H} fill="url(#scrim)" />
      </Svg>
    </View>
  );
}
