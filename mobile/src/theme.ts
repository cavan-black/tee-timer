/**
 * One place for the visual language: a dark, course-at-dusk palette so the
 * photography carries the screen and the UI stays out of its way.
 */
export const theme = {
  color: {
    bg: '#07120D',
    surface: '#0F1F17',
    surfaceHi: '#162E22',
    line: 'rgba(255,255,255,0.10)',
    lineStrong: 'rgba(255,255,255,0.18)',
    text: '#F2F7F4',
    muted: 'rgba(242,247,244,0.62)',
    faint: 'rgba(242,247,244,0.40)',
    accent: '#4ADE80',
    accentInk: '#04150C',
    deal: '#FFA94D',
    danger: '#FF8785',
  },
  radius: { sm: 10, md: 16, lg: 22, pill: 999 },
  space: (n: number) => n * 4,
  font: {
    display: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.6 },
    title: { fontSize: 19, fontWeight: '700' as const, letterSpacing: -0.3 },
    body: { fontSize: 15, fontWeight: '500' as const },
    label: { fontSize: 13, fontWeight: '600' as const },
    caption: { fontSize: 11.5, fontWeight: '600' as const, letterSpacing: 0.6 },
  },
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
  },
};

/** Absolute-fill as a plain ViewStyle (RN 0.86 dropped StyleSheet.absoluteFillObject). */
export const fill = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;

/** Deterministic accent per club, so a course always looks like itself. */
export function clubHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}
