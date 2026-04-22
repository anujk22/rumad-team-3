import { Tabs, useRouter } from 'expo-router';
import { Platform, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { Compass, MessageSquare, Users, Calendar, User } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const C = {
  surface:       '#fcf9f8',
  primary:       '#af101a',
  tertiary:      '#705d00',
  onSurface:     '#1b1c1c',
  outlineVariant:'rgba(228,190,186,0.2)',
};

import Svg, { Path } from 'react-native-svg';

// ── Shared Full House branded header ─────────────────────────────────────────
function FullHouseHeader() {
  const router = useRouter();
  return (
    <View style={hdr.container}>
      <View style={hdr.logoRow}>
        <View style={{ marginRight: 8, marginTop: 4 }}>
          <Image 
            source={require('../../assets/images/fullhouse_logo.png')} 
            style={{ width: 32, height: 32 }} 
            resizeMode="contain" 
          />
        </View>
        <View style={{ flexDirection: 'column', justifyContent: 'center' }}>
          <Text style={{ fontFamily: 'Newsreader_800ExtraBold', fontSize: 24, fontStyle: 'italic', letterSpacing: -0.5, color: '#1b1c1c', lineHeight: 26 }}>Full House</Text>
        </View>
      </View>
      <TouchableOpacity style={hdr.avatar} onPress={() => router.push('/settings')} activeOpacity={0.8}>
        <User size={18} color={C.primary} />
      </TouchableOpacity>
    </View>
  );
}

const hdr = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 16 : Platform.OS === 'ios' ? 44 : 32,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#e5e2e1',
    borderWidth: 2, borderColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});

// ── Tab icon+label pair ───────────────────────────────────────────────────────
function TabItem({ icon, label, active }: { icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      {icon}
      <Text style={{
        fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase',
        color: active ? C.tertiary : `${C.onSurface}50`,
      }}>
        {label}
      </Text>
    </View>
  );
}

// ── Tab navigator ─────────────────────────────────────────────────────────────
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        header: () => <FullHouseHeader />,
        tabBarStyle: {
          backgroundColor: 'rgba(252,249,248,0.96)',
          borderTopWidth: 1,
          borderTopColor: `${C.onSurface}0D`,
          height: Platform.OS === 'ios' ? 86 : 64,
          paddingBottom: Platform.OS === 'ios' ? 22 : 8,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.04,
          shadowRadius: 20,
          elevation: 16,
        },
        tabBarShowLabel: false, // labels rendered inside custom icon
        tabBarActiveTintColor: C.tertiary,
        tabBarInactiveTintColor: `${C.onSurface}50`,
      }}
    >
      {/* DISCOVER */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => (
            <TabItem
              label="Discover"
              active={focused}
              icon={<Compass size={24} color={focused ? C.tertiary : `${C.onSurface}50`} />}
            />
          ),
        }}
      />

      {/* SWIPE */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Swipe',
          tabBarIcon: ({ focused }) => (
            <TabItem
              label="Swipe"
              active={focused}
              icon={<MaterialCommunityIcons name="cards-playing-outline" size={26} color={focused ? C.tertiary : `${C.onSurface}50`} />}
            />
          ),
        }}
      />

      {/* CHATS */}
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ focused }) => (
            <TabItem
              label="Chats"
              active={focused}
              icon={<MessageSquare size={24} color={focused ? C.tertiary : `${C.onSurface}50`} />}
            />
          ),
        }}
      />

      {/* MEETUPS */}
      <Tabs.Screen
        name="meetups"
        options={{
          title: 'Meetups',
          tabBarIcon: ({ focused }) => (
            <TabItem
              label="Meetups"
              active={focused}
              icon={<Users size={24} color={focused ? C.tertiary : `${C.onSurface}50`} />}
            />
          ),
        }}
      />

      {/* EVENTS */}
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ focused }) => (
            <TabItem
              label="Events"
              active={focused}
              icon={<Calendar size={24} color={focused ? C.tertiary : `${C.onSurface}50`} />}
            />
          ),
        }}
      />
    </Tabs>
  );
}
