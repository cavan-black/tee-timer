import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { I18nProvider, useI18nState } from '../src/i18n';
import { ThemeProvider, useThemeState } from '../src/theme';

export default function RootLayout() {
  const state = useThemeState();
  const i18n = useI18nState();
  const { colors, name } = state;

  return (
    <ThemeProvider value={state}>
      <I18nProvider value={i18n}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
          <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'slide_from_right',
            }}
          />
        </GestureHandlerRootView>
      </I18nProvider>
    </ThemeProvider>
  );
}
