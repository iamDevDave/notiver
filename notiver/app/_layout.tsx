import { DarkTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import '../global.css';

import { ThemeProvider } from '@/src/theme';
import { AppProviders } from '@/src/providers';
import { colors } from '@/src/theme/tokens';

const customDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background.primary,
    card: colors.background.primary,
    border: colors.border.default,
    text: colors.text.primary,
    primary: colors.accent.primary,
  },
};

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppProviders>
          <NavigationThemeProvider value={customDarkTheme}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: colors.background.primary,
                },
              }}
            >
              <Stack.Screen
                name="(tabs)"
                options={{ headerShown: false }}
              />

              <Stack.Screen
                name="onboarding"
                options={{
                  presentation: 'modal',
                  animation: 'fade',
                }}
              />

              <Stack.Screen
                name="rule-builder"
                options={{
                  presentation: 'modal',
                  animation: 'slide_from_bottom',
                }}
              />

              <Stack.Screen
                name="focus-mode"
                options={{
                  presentation: 'modal',
                  animation: 'slide_from_bottom',
                }}
              />

              <Stack.Screen
                name="notification/[id]"
                options={{
                  animation: 'slide_from_right',
                }}
              />

              <Stack.Screen
                name="rule/[id]"
                options={{
                  animation: 'slide_from_right',
                }}
              />
            </Stack>

            <StatusBar style="light" />
          </NavigationThemeProvider>
        </AppProviders>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}