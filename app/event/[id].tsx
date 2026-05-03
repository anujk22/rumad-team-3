import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
import { F, formatEventTime } from '@/lib/helpers';
import { ChevronLeft, MapPin, Clock } from 'lucide-react-native';

export default function EventDetail() {
  const { id } = useLocalSearchParams();
  const { theme: C } = useTheme();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);

  useEffect(() => {
    supabase.from('events').select('*, profiles!creator_id(first_name)').eq('id', id).single().then(({ data }) => setEvent(data));
  }, [id]);

  if (!event) return null;

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      {event.poster_url && (
        <Animated.Image
          source={{ uri: event.poster_url }}
          style={{ width: '100%', height: 450 }}
          sharedTransitionTag={`event-poster-${id}`}
        />
      )}
      <TouchableOpacity 
        style={{ position: 'absolute', top: 60, left: 24, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }} 
        onPress={() => router.back()}
      >
        <ChevronLeft color="#fff" size={28} />
      </TouchableOpacity>
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingTop: 32 }}>
        <Text style={{ fontFamily: F.labelExtra, color: C.primary, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{event.profiles?.first_name || 'Admin'} PRESENTS</Text>
        <Text style={{ fontFamily: F.display, fontSize: 44, color: C.onSurface, lineHeight: 48, marginBottom: 24 }}>{event.title}</Text>
        
        <View style={{ flexDirection: 'row', gap: 24, marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MapPin size={24} color={C.secondary} />
            <Text style={{ fontFamily: F.headlineBase, fontSize: 16, color: C.secondary }}>{event.location}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Clock size={24} color={C.secondary} />
            <Text style={{ fontFamily: F.headlineBase, fontSize: 16, color: C.secondary }}>{formatEventTime(event.event_time)}</Text>
          </View>
        </View>
        
        {event.description && (
          <Text style={{ fontFamily: F.body, fontSize: 17, color: C.onSurface, lineHeight: 28 }}>{event.description}</Text>
        )}
      </ScrollView>
    </View>
  );
}
