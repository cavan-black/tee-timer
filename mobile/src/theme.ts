/**
 * Visual language, in two palettes.
 *
 * Colours are read at render time rather than baked into a module-level
 * StyleSheet, so the whole app can switch theme without a reload. Components
 * call `useTheme()` and build their styles with `useMemo`.
 */
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export interface Palette {
  bg: string;
  surface: string;
  surfaceHi: string;
  line: string;
  lineStrong: string;
  text: string;
  muted: string;
  faint: string;
  accent: string;
  accentInk: string;
  deal: string;
  danger: string;
  /** Text drawn over course photography, which is dark at the bottom either way. */
  onImage: string;
  placeholder: string;
}

const dark: Palette = {
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
  onImage: '#FFFFFF',
  placeholder: 'rgba(255,255,255,0.10)',
};

const light: Palette = {
  bg: '#F4F7F4',
  surface: '#FFFFFF',
  surfaceHi: '#E6EFE8',
  line: 'rgba(7,18,13,0.10)',
  lineStrong: 'rgba(7,18,13,0.20)',
  text: '#0B1A12',
  muted: 'rgba(11,26,18,0.66)',
  faint: 'rgba(11,26,18,0.45)',
  // Darker than the dark-mode green so it still reads on white.
  accent: '#0F8A45',
  accentInk: '#FFFFFF',
  deal: '#B45309',
  danger: '#B42318',
  onImage: '#FFFFFF',
  placeholder: 'rgba(7,18,13,0.08)',
};

export const palettes = { dark, light };
export type ThemeName = 'dark' | 'light';

export const theme = {
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

/** Absolute-fill as a plain ViewStyle (RN dropped StyleSheet.absoluteFillObject). */
export const fill = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;

// --------------------------------------------------------------------------

const STORAGE_KEY = 'teetimer:theme';

interface ThemeState {
  name: ThemeName;
  colors: Palette;
  toggle: () => void;
  /** True until the saved preference has been read, to avoid a flash. */
  loading: boolean;
}

const ThemeContext = React.createContext<ThemeState | null>(null);

export function useThemeState(): ThemeState {
  const system = useColorScheme();
  const [name, setName] = React.useState<ThemeName>('dark');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let live = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!live) return;
        // A saved choice wins; otherwise follow the phone.
        if (saved === 'dark' || saved === 'light') setName(saved);
        else if (system === 'light') setName('light');
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [system]);

  const toggle = React.useCallback(() => {
    setName((prev) => {
      const next: ThemeName = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  return React.useMemo(
    () => ({ name, colors: palettes[name], toggle, loading }),
    [name, toggle, loading],
  );
}

export const ThemeProvider = ThemeContext.Provider;

export function useTheme(): ThemeState {
  const ctx = React.useContext(ThemeContext);
  // Falling back to dark keeps a component usable outside the provider
  // (tests, storybook) rather than throwing.
  return ctx ?? { name: 'dark', colors: dark, toggle: () => {}, loading: false };
}

/** Deterministic accent per club, so a course always looks like itself. */
export function clubHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}
