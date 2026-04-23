import { useQueue } from '@/hooks/useQueue';
import { useTheme } from '@/hooks/useTheme';
import { F } from '@/lib/helpers';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Calendar, Compass, MessageSquare, User, Users } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Image, Platform, Text, TouchableOpacity, View } from 'react-native';

function FullHouseHeader() {
  const router = useRouter();
  const { status, queueCount, chatId, clearReady } = useQueue();
  const { theme: C, isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'queued') {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  const handleQueueTap = () => {
    if (status === 'ready' && chatId) {
      clearReady();
      router.push(`/chat/${chatId}` as any);
    }
  };

  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'web' ? 16 : Platform.OS === 'ios' ? 44 : 32,
      paddingBottom: 12,
      backgroundColor: C.card,
      borderBottomWidth: 1,
      borderBottomColor: C.outlineAlpha,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Image
          source={isDark
            ? require('../../assets/images/fullhouse_darkmode.png')
            : require('../../assets/images/fullhouse_logo.png')}
          style={{ width: 36, height: 36, marginRight: 10, marginTop: -2 }}
          resizeMode="contain"
        />
        <Text style={{
          fontFamily: 'AbhayaLibre_800ExtraBold',
          fontSize: 26,
          color: C.primary,
          letterSpacing: -0.8,
          lineHeight: 30,
          includeFontPadding: false,
          textAlignVertical: 'center',
        }}>
          Full House
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {status === 'queued' && (
          <Animated.View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: C.tertiary, borderRadius: 999,
            paddingHorizontal: 16, paddingVertical: 8,
            opacity: pulseAnim,
          }}>
            <MaterialCommunityIcons name="cards-playing-outline" size={12} color={C.onTertiary} />
            <Text style={{ fontFamily: F.label, fontSize: 10, color: C.onTertiary, letterSpacing: 1.5 }}>
              FINDING TABLE... {queueCount}
            </Text>
          </Animated.View>
        )}
        {status === 'ready' && (
          <TouchableOpacity style={{
            backgroundColor: C.primary, borderRadius: 999,
            paddingHorizontal: 14, paddingVertical: 8,
          }} onPress={handleQueueTap} activeOpacity={0.8}>
            <Text style={{ fontWeight: '700', fontSize: 12, color: C.onPrimary }}>🃏 Table Ready!</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={{
          width: 38, height: 38, borderRadius: 19,
          backgroundColor: C.surfaceContainerHigh, borderWidth: 2, borderColor: C.primary,
          alignItems: 'center', justifyContent: 'center',
        }} onPress={() => router.push('/settings')} activeOpacity={0.8}>
          <User size={18} color={C.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TabItem({ icon, label, active, theme }: { icon: React.ReactNode; label: string; active: boolean; theme: any }) {
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      {icon}
      <Text style={{
        fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase',
        color: active ? theme.tertiary : `${theme.onSurface}50`,
      }}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { theme: C } = useTheme();
  return (
    <Tabs
      screenOptions={{
        header: () => <FullHouseHeader />,
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopWidth: 1, borderTopColor: C.outlineAlpha,
          height: Platform.OS === 'ios' ? 86 : 64,
          paddingBottom: Platform.OS === 'ios' ? 22 : 8,
          paddingTop: 8,
          shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.04, shadowRadius: 20, elevation: 16,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: C.tertiary,
        tabBarInactiveTintColor: `${C.onSurface}50`,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => (
            <TabItem label="Discover" active={focused} theme={C}
              icon={<Compass size={24} color={focused ? C.tertiary : `${C.onSurface}50`} />}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Swipe',
          tabBarIcon: ({ focused }) => (
            <TabItem label="Swipe" active={focused} theme={C}
              icon={<MaterialCommunityIcons name="cards-playing-outline" size={26} color={focused ? C.tertiary : `${C.onSurface}50`} />}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ focused }) => (
            <TabItem label="Groups" active={focused} theme={C}
              icon={<MaterialCommunityIcons name="account-group-outline" size={26} color={focused ? C.tertiary : `${C.onSurface}50`} />}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ focused }) => (
            <TabItem label="Chats" active={focused} theme={C}
              icon={<MessageSquare size={24} color={focused ? C.tertiary : `${C.onSurface}50`} />}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="meetups"
        options={{
          title: 'Meetups',
          tabBarIcon: ({ focused }) => (
            <TabItem label="Meetups" active={focused} theme={C}
              icon={<Users size={24} color={focused ? C.tertiary : `${C.onSurface}50`} />}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ focused }) => (
            <TabItem label="Events" active={focused} theme={C}
              icon={<Calendar size={24} color={focused ? C.tertiary : `${C.onSurface}50`} />}
            />
          ),
        }}
      />
    </Tabs>
  );
}
