import { useAuth } from '@/hooks/useAuth';
import { C, F, formatEventTime } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { Clock, Image as ImageIcon, MapPin, Plus, Star, User, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';

type EventItem = {
  id: string; title: string; location: string; description: string | null;
  event_time: string; poster_url: string | null; creator_id: string;
  profiles: { first_name: string };
  attendee_count: number;
  am_attending: boolean;
};

export default function EventsScreen() {
  const { user, isEventManager } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [posterPhoto, setPosterPhoto] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, profiles!creator_id(first_name)')
        .gte('event_time', new Date().toISOString())
        .order('event_time', { ascending: true });

      if (error) throw error;

      const enriched: EventItem[] = [];
      for (const e of data || []) {
        const { count } = await supabase
          .from('event_attendees')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', e.id);

        let isAttending = false;
        if (user) {
          const { data: att } = await supabase
            .from('event_attendees')
            .select('event_id')
            .eq('event_id', e.id)
            .eq('user_id', user.id)
            .single();
          isAttending = !!att;
        }

        enriched.push({ ...e, attendee_count: count || 0, am_attending: isAttending });
      }

      setEvents(enriched);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRsvp = async (eventId: string) => {
    if (!user) return;
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    if (event.am_attending) {
      await supabase.from('event_attendees').delete().eq('event_id', eventId).eq('user_id', user.id);
    } else {
      await supabase.from('event_attendees').insert({ event_id: eventId, user_id: user.id });
    }
    await fetchEvents();
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [3, 4], quality: 0.8, base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setPosterPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newLocation.trim() || !user) {
      Alert.alert('Required', 'Title and location are required.');
      return;
    }
    setCreating(true);
    try {
      let posterUrl = null;
      if (posterPhoto) {
        const base64Data = posterPhoto.replace(/^data:image\/\w+;base64,/, '');
        const filePath = `events/${Date.now()}.jpg`;
        await supabase.storage.from('posters').upload(filePath, decode(base64Data), { contentType: 'image/jpeg' });
        const { data: { publicUrl } } = supabase.storage.from('posters').getPublicUrl(filePath);
        posterUrl = publicUrl;
      }

      const { error } = await supabase.from('events').insert({
        creator_id: user.id,
        title: newTitle.trim(),
        location: newLocation.trim(),
        description: newDesc.trim() || null,
        event_time: new Date(Date.now() + 86400000).toISOString(), // Default tomorrow
        poster_url: posterUrl,
      });
      if (error) throw error;
      setShowModal(false);
      setNewTitle(''); setNewLocation(''); setNewDesc(''); setPosterPhoto(null);
      await fetchEvents();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surfaceContainer, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  const featured = events[0];
  const rest = events.slice(1);

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.maxWidthContainer}>
          <View style={styles.headerBox}>
            <Text style={styles.eyebrow}>LIVE DECK</Text>
            <Text style={styles.pageTitle}>Events</Text>
          </View>

          {featured ? (
            <View style={styles.relativeWrap}>
              <View style={styles.badgeRoyal}>
                <MaterialCommunityIcons name="shield-star-outline" size={12} color={C.onTertiary} />
                <Text style={styles.badgeRoyalText}>HOUSE VERIFIED</Text>
              </View>
              <View style={styles.featCardContainer}>
                <View style={[styles.featCardContentLayout, isTablet ? { flexDirection: 'row' } : { flexDirection: 'column' as any }]}>
                  {featured.poster_url && (
                    <View style={[styles.featPosterWrap, isTablet ? { flex: 1 } : { width: '100%', marginBottom: 20 }]}>
                      <Image source={{ uri: featured.poster_url }} style={styles.featPosterImg} />
                    </View>
                  )}
                  <View style={[styles.featTextWrap, isTablet ? { flex: 2 } : { width: '100%' }]}>
                    <View style={{ gap: 4 }}>
                      <View style={styles.featSubheadRow}>
                        <Star size={14} color={C.tertiary} fill={C.tertiary} />
                        <Text style={styles.featSubheadText}>{featured.profiles?.first_name || 'Admin'}</Text>
                      </View>
                      <Text style={styles.featTitleText}>{featured.title}</Text>
                    </View>
                    {featured.description && <Text style={styles.featDescText}>{featured.description}</Text>}
                    <View style={styles.featMetaLayer}>
                      <View style={styles.featMetaItem}>
                        <MapPin size={18} color={C.onSurfaceVariant} />
                        <Text style={styles.featMetaText}>{featured.location}</Text>
                      </View>
                      <View style={styles.featMetaItem}>
                        <Clock size={18} color={C.onSurfaceVariant} />
                        <Text style={styles.featMetaText}>{formatEventTime(featured.event_time).toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      <View style={[styles.pillOutline, { backgroundColor: 'rgba(255,225,109,0.3)' }]}>
                        <Text style={[styles.pillLabel, { color: C.tertiary }]}>{featured.attendee_count} GOING</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.dealBtn} activeOpacity={0.85} onPress={() => handleRsvp(featured.id)}>
                      <Text style={styles.dealBtnLabel}>{featured.am_attending ? 'FOLD' : 'DEAL ME IN'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ) : null}

          {/* Rest of events */}
          {rest.map(event => (
            <View key={event.id} style={[styles.meetupCard, { width: '100%', marginBottom: 16 }]}>
              <View style={{ flexDirection: isTablet ? 'row' : 'column' }}>
                {event.poster_url && (
                  <View style={isTablet ? { width: 120, marginRight: 16 } : { width: '100%', height: 180, marginBottom: 16 }}>
                    <Image source={{ uri: event.poster_url }} style={{ width: '100%', height: '100%', borderRadius: 10 }} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.meetupTitle}>{event.title}</Text>
                  {event.description && <Text style={styles.meetupDescText} numberOfLines={2}>{event.description}</Text>}
                  <View style={styles.meetupFooterRow}>
                    <MapPin size={16} color={C.onSurfaceVariant} />
                    <Text style={styles.meetupFooterLoc}>{event.location.toUpperCase()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <View style={[styles.pillOutline, { backgroundColor: 'rgba(255,225,109,0.3)' }]}>
                      <Text style={[styles.pillLabel, { color: C.tertiary }]}>{event.attendee_count} GOING</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.joinBtnSmall, event.am_attending && styles.joinBtnSmallActive]}
                      onPress={() => handleRsvp(event.id)}
                    >
                      <Text style={[styles.joinBtnSmallText, event.am_attending && { color: '#fff' }]}>
                        {event.am_attending ? 'GOING ✓' : 'RSVP'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))}

          {events.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="cards-playing-outline" size={56} color={`${C.onSurface}25`} />
              <Text style={styles.emptyTitle}>No events yet.</Text>
              <Text style={styles.emptyBody}>Stay tuned for upcoming events!</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* FAB only for admin/event_manager */}
      {isEventManager && (
        <TouchableOpacity style={styles.fabBtn} onPress={() => setShowModal(true)} activeOpacity={0.85}>
          <Plus size={32} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Create event modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
        <ScrollView style={styles.modalBg} contentContainerStyle={styles.modalInner} keyboardShouldPersistTaps="handled">
          <View style={styles.modalTopBar}>
            <Text style={styles.modalTitleText}>Create Event</Text>
            <TouchableOpacity onPress={() => setShowModal(false)} style={{ padding: 8 }}>
              <X size={24} color={C.onSurface} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.modalImgUploadBox} onPress={pickImage} activeOpacity={0.8}>
            {posterPhoto ? (
              <Image source={{ uri: posterPhoto }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <View style={{ alignItems: 'center', gap: 8 }}>
                <ImageIcon size={42} color={C.onSurfaceVariant} />
                <Text style={{ fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 2, color: C.onSurfaceVariant }}>TAP TO UPLOAD EVENT POSTER</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.modalInputLabel}>EVENT TITLE</Text>
          <TextInput style={styles.modalInputLine} placeholder="Concert night" placeholderTextColor={C.outline} value={newTitle} onChangeText={setNewTitle} />

          <Text style={styles.modalInputLabel}>LOCATION</Text>
          <TextInput style={styles.modalInputLine} placeholder="Student Center" placeholderTextColor={C.outline} value={newLocation} onChangeText={setNewLocation} />

          <Text style={styles.modalInputLabel}>DESCRIPTION (OPTIONAL)</Text>
          <TextInput style={[styles.modalInputLine, { height: 100, paddingTop: 16, textAlignVertical: 'top' }]} placeholder="Tell people what to expect..." placeholderTextColor={C.outline} multiline value={newDesc} onChangeText={setNewDesc} />

          <TouchableOpacity style={styles.dealBtn} onPress={handleCreate} disabled={creating}>
            <Text style={styles.dealBtnLabel}>{creating ? 'CREATING...' : 'DEAL IT OUT'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surfaceContainer },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 8, alignItems: 'center' },
  maxWidthContainer: { width: '100%', maxWidth: 672, flex: 1 },
  headerBox: { marginBottom: 28 },
  eyebrow: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 2, color: C.primary, textTransform: 'uppercase' },
  pageTitle: { fontFamily: F.display, fontSize: 48, lineHeight: 52, color: C.onSurface, letterSpacing: -1 },
  relativeWrap: { position: 'relative', marginBottom: 24 },
  badgeRoyal: { position: 'absolute', top: -12, right: 0, backgroundColor: C.tertiary, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, zIndex: 10, transform: [{ rotate: '3deg' }], shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  badgeRoyalText: { fontFamily: F.labelExtra, fontSize: 10, color: C.onTertiary, letterSpacing: 1, textTransform: 'uppercase' },
  featCardContainer: { backgroundColor: C.surfaceContainerLowest, borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 2, borderWidth: 1, borderColor: 'rgba(228,190,186,0.2)' },
  featCardContentLayout: { gap: 24 },
  featPosterWrap: { aspectRatio: 3 / 4, borderRadius: 10, overflow: 'hidden', transform: [{ rotate: '-2deg' }], shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, backgroundColor: C.surfaceContainerHighest },
  featPosterImg: { width: '100%', height: '100%' },
  featTextWrap: { justifyContent: 'center', gap: 16 },
  featSubheadRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featSubheadText: { fontFamily: F.labelExtra, fontSize: 12, letterSpacing: 1.5, color: C.tertiary },
  featTitleText: { fontFamily: F.display, fontSize: 32, color: C.onSurface, lineHeight: 36 },
  featDescText: { fontFamily: F.body, fontSize: 14, color: C.onSurfaceVariant, lineHeight: 22 },
  featMetaLayer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 4, marginBottom: 4 },
  featMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featMetaText: { fontFamily: F.bodyBold, fontSize: 11, color: C.onSurfaceVariant },
  pillOutline: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pillLabel: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 0.5 },
  dealBtn: { backgroundColor: C.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', width: '100%', marginTop: 4 },
  dealBtnLabel: { fontFamily: F.labelExtra, color: '#fff', fontSize: 14, letterSpacing: 2 },
  meetupCard: { backgroundColor: C.surfaceContainerLowest, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: 'rgba(228,190,186,0.2)', position: 'relative', overflow: 'hidden' },
  meetupTitle: { fontFamily: F.display, fontSize: 22, marginBottom: 8, color: C.onSurface },
  meetupDescText: { fontFamily: F.body, fontSize: 12, lineHeight: 18, color: C.onSurfaceVariant, marginBottom: 12 },
  meetupFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meetupFooterLoc: { fontFamily: F.labelExtra, fontSize: 10, textTransform: 'uppercase', color: C.onSurfaceVariant, letterSpacing: 0.5 },
  joinBtnSmall: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: C.primary },
  joinBtnSmallActive: { backgroundColor: C.primary, borderColor: C.primary },
  joinBtnSmallText: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 1, color: C.primary },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontFamily: F.display, fontSize: 22, color: `${C.onSurface}99` },
  emptyBody: { fontFamily: F.body, fontSize: 14, color: C.secondary },
  fabBtn: { position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 24, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 8 },
  modalBg: { flex: 1, backgroundColor: C.surfaceContainerLowest },
  modalInner: { padding: 24, paddingBottom: 48 },
  modalTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitleText: { fontFamily: F.display, fontSize: 26, color: C.onSurface, letterSpacing: -0.8 },
  modalImgUploadBox: { width: '100%', height: 260, backgroundColor: C.surfaceContainerLow, borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(228,190,186,0.2)', borderStyle: 'dashed', marginBottom: 24, alignItems: 'center', justifyContent: 'center' },
  modalInputLabel: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 2, color: C.onSurfaceVariant, textTransform: 'uppercase', marginBottom: 8 },
  modalInputLine: { fontFamily: F.body, backgroundColor: C.surfaceContainerLowest, color: C.onSurface, borderRadius: 14, height: 56, paddingHorizontal: 18, fontSize: 16, marginBottom: 20, borderWidth: 1.5, borderColor: 'rgba(228,190,186,0.2)' },
});
