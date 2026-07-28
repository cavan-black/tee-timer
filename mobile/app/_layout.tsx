import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemeProvider, useThemeState } from '../src/theme';

export default function RootLayout() {
  const state = useThemeState();
  const { colors, name } = state;

  return (
    <ThemeProvider value={state}>
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
    </ThemeProvider>
  );
}
