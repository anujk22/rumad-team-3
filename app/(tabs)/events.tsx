import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { F, formatEventTime } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { Clock, Image as ImageIcon, MapPin, Plus, Star, X } from 'lucide-react-native';
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
  const { theme: C } = useTheme();
  const styles = createStyles(C);
  const { user, profile, isEventManager } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newAmPm, setNewAmPm] = useState<'AM' | 'PM'>('PM');
  const [posterPhoto, setPosterPhoto] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Auto-format date as MM/DD/YYYY while typing
  const handleDateChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let masked = digits;
    if (digits.length > 4) masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) masked = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setNewDate(masked);
  };

  // Auto-format time as HH:MM while typing
  const handleTimeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    let masked = digits;
    if (digits.length > 2) masked = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    setNewTime(masked);
  };

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

  // Parse user-entered date (MM/DD/YYYY) and time (HH:MM AM/PM) into a Date
  const parseEventDateTime = (): Date => {
    try {
      if (newDate.trim()) {
        const [month, day, year] = newDate.trim().split('/').map(Number);
        let hours = 12; let minutes = 0;
        if (newTime.trim()) {
          const parts = newTime.trim().split(':');
          hours = parseInt(parts[0]) || 12;
          minutes = parseInt(parts[1]) || 0;
          if (newAmPm === 'PM' && hours !== 12) hours += 12;
          if (newAmPm === 'AM' && hours === 12) hours = 0;
        }
        const d = new Date(year, month - 1, day, hours, minutes);
        if (!isNaN(d.getTime())) return d;
      }
    } catch { }
    // Default: tomorrow at noon
    return new Date(Date.now() + 86400000);
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
        event_time: parseEventDateTime().toISOString(),
        poster_url: posterUrl,
      });
      if (error) throw error;
      setShowModal(false);
      setNewTitle(''); setNewLocation(''); setNewDesc(''); setNewDate(''); setNewTime(''); setNewAmPm('PM'); setPosterPhoto(null);
      await fetchEvents();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    Alert.alert('Remove Event', 'Are you sure you want to remove this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('events').delete().eq('id', eventId);
            if (error) throw error;
            await fetchEvents();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
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
                      <View style={[styles.pillOutline, { backgroundColor: C.tertiaryAlpha }]}>
                        <Text style={[styles.pillLabel, { color: C.tertiary }]}>{featured.attendee_count} GOING</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity style={styles.dealBtn} activeOpacity={0.85} onPress={() => handleRsvp(featured.id)}>
                        <Text style={styles.dealBtnLabel}>{featured.am_attending ? 'FOLD' : 'DEAL ME IN'}</Text>
                      </TouchableOpacity>
                      {(user?.id === featured.creator_id || profile?.role === 'admin') && (
                        <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.85} onPress={() => handleDelete(featured.id)}>
                          <Text style={styles.deleteBtnLabel}>REMOVE</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ) : null}

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
                  <View style={styles.meetupFooterRow} >
                    <Clock size={14} color={C.onSurfaceVariant} />
                    <Text style={styles.meetupFooterLoc}>{formatEventTime(event.event_time)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <View style={[styles.pillOutline, { backgroundColor: C.tertiaryAlpha }]}>
                      <Text style={[styles.pillLabel, { color: C.tertiary }]}>{event.attendee_count} GOING</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {(user?.id === event.creator_id || profile?.role === 'admin') && (
                        <TouchableOpacity style={styles.deleteBtnSmall} onPress={() => handleDelete(event.id)}>
                          <Text style={styles.deleteBtnSmallText}>REMOVE</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.joinBtnSmall, event.am_attending && styles.joinBtnSmallActive]}
                        onPress={() => handleRsvp(event.id)}
                      >
                        <Text style={[styles.joinBtnSmallText, event.am_attending && { color: C.onPrimary }]}>
                          {event.am_attending ? 'GOING ✓' : 'RSVP'}
                        </Text>
                      </TouchableOpacity>
                    </View>
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

      {isEventManager && (
        <TouchableOpacity style={styles.fabBtn} onPress={() => setShowModal(true)} activeOpacity={0.85}>
          <Plus size={32} color={C.onPrimary} />
        </TouchableOpacity>
      )}

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

          <Text style={styles.modalInputLabel}>DATE</Text>
          <TextInput
            style={styles.modalInputLine}
            placeholder="MM/DD/YYYY"
            placeholderTextColor={C.outline}
            value={newDate}
            onChangeText={handleDateChange}
            keyboardType="number-pad"
            maxLength={10}
          />

          <Text style={styles.modalInputLabel}>TIME</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <TextInput
              style={[styles.modalInputLine, { flex: 1, marginBottom: 0 }]}
              placeholder="HH:MM"
              placeholderTextColor={C.outline}
              value={newTime}
              onChangeText={handleTimeChange}
              keyboardType="number-pad"
              maxLength={5}
            />
            <TouchableOpacity
              onPress={() => setNewAmPm(p => p === 'AM' ? 'PM' : 'AM')}
              style={{
                backgroundColor: C.primary, borderRadius: 12,
                paddingHorizontal: 20, height: 56,
                alignItems: 'center', justifyContent: 'center',
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontFamily: F.labelExtra, fontSize: 14, color: C.onPrimary, letterSpacing: 1 }}>{newAmPm}</Text>
            </TouchableOpacity>
          </View>

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

const createStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 8, alignItems: 'center' },
  maxWidthContainer: { width: '100%', maxWidth: 672, flex: 1 },
  headerBox: { marginBottom: 28 },
  eyebrow: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 2, color: C.primary, textTransform: 'uppercase' },
  pageTitle: { fontFamily: F.display, fontSize: 48, lineHeight: 52, color: C.onSurface, letterSpacing: -1 },
  relativeWrap: { position: 'relative', marginBottom: 24 },
  badgeRoyal: { position: 'absolute', top: -12, right: 0, backgroundColor: C.tertiary, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, zIndex: 10, transform: [{ rotate: '3deg' }], shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  badgeRoyalText: { fontFamily: F.labelExtra, fontSize: 10, color: C.onTertiary, letterSpacing: 1, textTransform: 'uppercase' },
  featCardContainer: { backgroundColor: C.card, borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 30, elevation: 3, borderWidth: 1.5, borderColor: C.outlineAlpha },
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
  dealBtn: { flex: 1, backgroundColor: C.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  dealBtnLabel: { fontFamily: F.labelExtra, color: C.onPrimary, fontSize: 14, letterSpacing: 2 },
  deleteBtn: { backgroundColor: C.surfaceContainerHigh, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 4, borderWidth: 1.5, borderColor: C.outlineAlpha },
  deleteBtnLabel: { fontFamily: F.labelExtra, color: C.onSurface, fontSize: 14, letterSpacing: 2 },
  meetupCard: { backgroundColor: C.card, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 2, borderWidth: 1.5, borderColor: C.outlineAlpha, position: 'relative', overflow: 'hidden' },
  meetupTitle: { fontFamily: F.display, fontSize: 22, marginBottom: 8, color: C.onSurface },
  meetupDescText: { fontFamily: F.body, fontSize: 12, lineHeight: 18, color: C.onSurfaceVariant, marginBottom: 12 },
  meetupFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meetupFooterLoc: { fontFamily: F.labelExtra, fontSize: 10, textTransform: 'uppercase', color: C.onSurfaceVariant, letterSpacing: 0.5 },
  joinBtnSmall: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: C.primary },
  joinBtnSmallActive: { backgroundColor: C.primary, borderColor: C.primary },
  joinBtnSmallText: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 1, color: C.primary },
  deleteBtnSmall: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: C.outlineAlpha, backgroundColor: C.surfaceContainerHigh },
  deleteBtnSmallText: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 1, color: C.onSurface },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontFamily: F.display, fontSize: 22, color: `${C.onSurface}99` },
  emptyBody: { fontFamily: F.body, fontSize: 14, color: C.secondary },
  fabBtn: { position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 24, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 8 },
  modalBg: { flex: 1, backgroundColor: C.surface },
  modalInner: { padding: 24, paddingBottom: 48 },
  modalTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitleText: { fontFamily: F.display, fontSize: 26, color: C.onSurface, letterSpacing: -0.8 },
  modalImgUploadBox: { width: '100%', height: 260, backgroundColor: C.surfaceContainerLow, borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: C.outlineAlpha, borderStyle: 'dashed', marginBottom: 24, alignItems: 'center', justifyContent: 'center' },
  modalInputLabel: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 2, color: C.onSurfaceVariant, textTransform: 'uppercase', marginBottom: 8 },
  modalInputLine: { fontFamily: F.body, backgroundColor: C.surfaceContainerLow, color: C.onSurface, borderRadius: 14, height: 56, paddingHorizontal: 18, fontSize: 16, marginBottom: 20, borderWidth: 1.5, borderColor: C.outlineAlpha },
});
