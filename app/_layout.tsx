import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
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
  const { session, user, initialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isProfileSetup, setIsProfileSetup] = useState<boolean | null>(null);

  useEffect(() => {
    // Listen for incoming deep links to handle Supabase Auth redirects
    const subscription = Linking.addEventListener('url', async (event) => {
      // Supabase automatically parses tokens on Web when the page loads, 
      // but in React Native we need to handle the deep link URL manually.
      if (event.url.includes('#access_token') || event.url.includes('?access_token')) {
        const urlParams = new URL(event.url.replace('#', '?'));
        const access_token = urlParams.searchParams.get('access_token');
        const refresh_token = urlParams.searchParams.get('refresh_token');

        if (access_token && refresh_token) {
          await supabase.auth.setSession({
            access_token,
            refresh_token
          });
        }
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!initialized || !user) {
      if (!user && initialized) {
        setIsProfileSetup(false);
      }
      return;
    }

    // DEV BYPASS: Instantly route mock user to tabs
    if (user.id === '00000000-0000-0000-0000-000000000000') {
      setIsProfileSetup(true);
      return;
    }

    const checkProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .single();

      if (data && data.first_name) {
        setIsProfileSetup(true);
      } else {
        setIsProfileSetup(false);
      }
    };
    checkProfile();
  }, [user, initialized]);

  useEffect(() => {
    if (!initialized || isProfileSetup === null) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inSetupGroup = segments[0] === '(setup)';

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/(auth)');
      }
    } else if (session && !isProfileSetup) {
      if (!inSetupGroup) {
        router.replace('/(setup)/profile');
      }
    } else if (session && isProfileSetup) {
      if (inAuthGroup || inSetupGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [session, initialized, isProfileSetup, segments]);

  if (!initialized || (session && isProfileSetup === null)) {
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
        <Stack.Screen 
          name="settings" 
          options={{ 
            title: 'Settings', 
            headerStyle: { backgroundColor: '#fcf9f8' }, 
            headerShadowVisible: false, 
            headerTintColor: '#1b1c1c', 
            headerTitleStyle: { fontFamily: 'Newsreader_800ExtraBold', fontSize: 22 } 
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
      <RootLayoutNav />
    </AuthProvider>
  );
}
