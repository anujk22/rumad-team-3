import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { QueueProvider } from '@/hooks/useQueue';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';
import { useFonts } from 'expo-font';
import { AbhayaLibre_800ExtraBold } from '@expo-google-fonts/abhaya-libre';
import { PlusJakartaSans_400Regular, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { Manrope_400Regular, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { Newsreader_400Regular, Newsreader_700Bold, Newsreader_800ExtraBold } from '@expo-google-fonts/newsreader';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { session, profile, initialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inSetupGroup = segments[0] === '(setup)';

    if (!session) {
      // Not logged in → go to auth
      if (!inAuthGroup) {
        router.replace('/(auth)');
      }
    } else if (profile && !profile.onboarding_completed) {
      // Logged in but hasn't completed onboarding
      if (!inSetupGroup) {
        router.replace('/(setup)/profile');
      }
    } else if (profile && profile.onboarding_completed) {
      // Logged in and onboarding complete → go to main app
      if (inAuthGroup || inSetupGroup) {
        router.replace('/(tabs)');
      }
    }
    // If profile is null but session exists, we're still loading profile — do nothing
  }, [session, profile, initialized, segments]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fcf9f8', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#af101a" size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(setup)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="settings"
          options={{
            title: 'Settings',
            headerStyle: { backgroundColor: '#fcf9f8' },
            headerShadowVisible: false,
            headerTintColor: '#1b1c1c',
            headerTitleStyle: { fontFamily: 'Newsreader_800ExtraBold', fontSize: 22 },
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
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
    <AuthProvider>
      <QueueProvider>
        <RootLayoutNav />
      </QueueProvider>
    </AuthProvider>
  );
}
