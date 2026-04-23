import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { QueueProvider } from '@/hooks/useQueue';
import { ThemeProvider, useTheme } from '@/hooks/useTheme';
import { AbhayaLibre_800ExtraBold } from '@expo-google-fonts/abhaya-libre';
import { Manrope_400Regular, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { Newsreader_400Regular, Newsreader_700Bold, Newsreader_800ExtraBold } from '@expo-google-fonts/newsreader';
import { PlusJakartaSans_400Regular, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { session, profile, initialized } = useAuth();
  const { isDark, theme } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inSetupGroup = segments[0] === '(setup)';
    const onResetPassword = segments[1] === 'reset-password';

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/(auth)');
      }
    } else if (onResetPassword) {
      // Always allow the reset-password screen — user arrived via email link
      // and must be able to set a new password before being redirected anywhere.
    } else if (profile && !profile.onboarding_completed) {
      if (segments[1] === 'create-password') {
        // Let them stay on password creation
      } else if (!inSetupGroup) {
        router.replace('/(setup)/profile');
      }
    } else if (profile && profile.onboarding_completed) {
      if (inAuthGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [session, profile, initialized, segments]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <NavThemeProvider value={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.surface } }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(setup)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="settings"
          options={{
            title: 'Settings',
            headerTitleAlign: 'center',
            headerStyle: { backgroundColor: theme.card },
            headerShadowVisible: false,
            headerTintColor: theme.onSurface,
            headerTitleStyle: { fontFamily: 'Newsreader_700Bold', fontSize: 22 },
          }}
        />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    AbhayaLibre_800ExtraBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Manrope_400Regular,
    Manrope_700Bold,
    Newsreader_400Regular,
    Newsreader_700Bold,
    Newsreader_800ExtraBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <QueueProvider>
          <RootLayoutNav />
        </QueueProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
