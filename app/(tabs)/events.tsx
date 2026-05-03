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
import { useRouter } from 'expo-router';
import Reanimated from 'react-native-reanimated';

// Types
type Meetup = {
  id: string; title: string; location: string; description: string | null;
  meetup_time: string; max_capacity: number; image_url: string | null;
  creator_id: string; created_at: string;
  profiles: { first_name: string };
  attendee_count: number;
  am_attending: boolean;
};

type CampusEvent = {
  id: string; name: string; description: string; location: string; startsOn: string;
  imagePath: string | null;
};

const CAMPUSES = [
  { id: 'ca', name: 'College Ave', x: '45%', y: '30%' },
  { id: 'livi', name: 'Livingston', x: '65%', y: '60%' },
  { id: 'busch', name: 'Busch', x: '35%', y: '65%' },
  { id: 'cd', name: 'Cook/Doug', x: '75%', y: '20%' },
];

const SpotlightMap = ({ meetups, theme: C }: { meetups: Meetup[]; theme: any }) => {
  return (
    <View style={{ width: '100%', height: 160, backgroundColor: C.surfaceContainerHighest, borderRadius: 20, marginBottom: 24, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: C.outlineAlpha }}>
      <Text style={{ position: 'absolute', top: 16, left: 16, fontFamily: F.labelExtra, fontSize: 10, color: C.secondary, letterSpacing: 1.5 }}>CAMPUS RADAR</Text>
      
      <View style={{ position: 'absolute', top: '40%', left: '-10%', right: '-10%', height: 2, backgroundColor: C.outlineAlpha, transform: [{ rotate: '-15deg' }] }} />
      <View style={{ position: 'absolute', top: '60%', left: '-10%', right: '-10%', height: 2, backgroundColor: C.outlineAlpha, transform: [{ rotate: '25deg' }] }} />

      {CAMPUSES.map((campus) => {
        const activeMeetups = meetups.filter(m => {
          const loc = m.location.toLowerCase();
          return loc.includes(campus.name.toLowerCase().split('/')[0]) || 
                 (campus.id === 'ca' && loc.includes('college')) ||
                 (campus.id === 'cd' && loc.includes('cook'));
        });
        const count = activeMeetups.length;
        const isActive = count > 0;
        
        return (
          <View key={campus.id} style={{ position: 'absolute', left: campus.x as any, top: campus.y as any, alignItems: 'center' }}>
            <View style={{ position: 'relative', width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              {isActive && (
                <View style={{ position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary, opacity: 0.2 }} />
              )}
              <View style={{ width: isActive ? 14 : 10, height: isActive ? 14 : 10, borderRadius: 12, backgroundColor: isActive ? C.primary : C.outline, shadowColor: isActive ? C.primary : 'transparent', shadowOpacity: 0.8, shadowRadius: 10 }} />
            </View>
            <Text style={{ fontFamily: F.labelExtra, fontSize: 9, color: isActive ? C.primary : C.onSurfaceVariant, marginTop: 4, letterSpacing: 0.5 }}>{campus.name.toUpperCase()}</Text>
          </View>
        );
      })}
    </View>
  );
};

export default function EventsScreen() {
  const { theme: C } = useTheme();
  const styles = createStyles(C);
  const { user, profile, isEventManager } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'meetups' | 'campus'>('meetups');

  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [campusEvents, setCampusEvents] = useState<CampusEvent[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newCampus, setNewCampus] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [editMeetupId, setEditMeetupId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchMeetups(), fetchCampusEvents()]).finally(() => setLoading(false));
  }, []);

  const fetchCampusEvents = async () => {
    try {
      const res = await fetch('/api/events');
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
      }
      const data = await res.json();
      setCampusEvents(data.value || []);
    } catch (err) {
      console.log("Failed to fetch campus events", err);
    }
  };

  const fetchMeetups = async () => {
    try {
      const { data, error } = await supabase
        .from('meetups')
        .select('*, profiles!creator_id(first_name)')
        .gte('meetup_time', new Date(Date.now() - 3600000 * 2).toISOString())
        .order('meetup_time', { ascending: true });

      if (error) throw error;

      const enriched: Meetup[] = [];
      for (const m of data || []) {
        const { count } = await supabase
          .from('meetup_attendees')
          .select('*', { count: 'exact', head: true })
          .eq('meetup_id', m.id);

        let isAttending = false;
        if (user) {
          const { data: att } = await supabase
            .from('meetup_attendees')
            .select('meetup_id')
            .eq('meetup_id', m.id)
            .eq('user_id', user.id)
            .single();
          isAttending = !!att;
        }
        enriched.push({ ...m, attendee_count: count || 0, am_attending: isAttending });
      }
      setMeetups(enriched);
    } catch (err) {
      console.error('Error fetching meetups:', err);
    }
  };

  const handleJoinMeetup = async (meetupId: string) => {
    if (!user) return;
    const meetup = meetups.find(m => m.id === meetupId);
    if (!meetup) return;

    if (meetup.am_attending) {
      await supabase.from('meetup_attendees').delete().eq('meetup_id', meetupId).eq('user_id', user.id);
    } else {
      if (meetup.attendee_count >= meetup.max_capacity) {
        Alert.alert('Full House', 'This meetup is at full capacity!');
        return;
      }
      await supabase.from('meetup_attendees').insert({ meetup_id: meetupId, user_id: user.id });
      
      // GroupMe Bot integration test
      if (Platform.OS === 'web') {
        window.alert("GroupMe Bot spun up!\n\nA temporary GroupMe chat has been created for this meetup. Check your app to join!");
      } else {
        Alert.alert('GroupMe Bot spun up!', 'A temporary GroupMe chat has been created for this meetup. Check your app to join!');
      }
    }
    await fetchMeetups();
  };

  const openEditModal = (meetup: Meetup) => {
    setEditMeetupId(meetup.id);
    setNewTitle(meetup.title);
    
    // Attempt to extract campus from location string like "Library (College Ave)"
    let loc = meetup.location;
    let foundCampus = '';
    for (const c of CAMPUSES) {
      if (loc.includes(`(${c.name})`)) {
        foundCampus = c.name;
        loc = loc.replace(`(${c.name})`, '').trim();
        break;
      }
    }
    setNewCampus(foundCampus);
    setNewLocation(loc);
    setNewDesc(meetup.description || '');
    setShowModal(true);
  };

  const handleSaveMeetup = async () => {
    if (!newTitle.trim() || !newLocation.trim() || !user) {
      Alert.alert('Required', 'Title and location are required.');
      return;
    }
    setCreating(true);
    try {
      const finalLocation = newCampus ? `${newLocation.trim()} (${newCampus})` : newLocation.trim();
      
      if (editMeetupId) {
        const { error } = await supabase.from('meetups').update({
          title: newTitle.trim(),
          location: finalLocation,
          description: newDesc.trim() || null,
        }).eq('id', editMeetupId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('meetups').insert({
          creator_id: user.id,
          title: newTitle.trim(),
          location: finalLocation,
          description: newDesc.trim() || null,
          meetup_time: new Date().toISOString(),
          max_capacity: 10,
        });
        if (error) throw error;
      }
      
      setShowModal(false);
      setNewTitle(''); setNewLocation(''); setNewCampus(''); setNewDesc(''); setEditMeetupId(null);
      await fetchMeetups();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteMeetup = async (meetupId: string) => {
    const performDelete = async () => {
      try {
        const { error } = await supabase.from('meetups').delete().eq('id', meetupId);
        if (error) throw error;
        await fetchMeetups();
      } catch (err: any) {
        Alert.alert('Error', err.message);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to end this meetup?');
      if (confirmed) {
        performDelete();
      }
    } else {
      Alert.alert('End Meetup', 'Are you sure you want to end this meetup?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End', style: 'destructive', onPress: performDelete },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.maxWidthContainer}>
          <View style={styles.headerBox}>
            <Text style={styles.eyebrow}>DISCOVER EVENTS</Text>
            <Text style={styles.pageTitle}>Events</Text>
          </View>
          
          <View style={styles.segmentControl}>
            <TouchableOpacity style={[styles.segmentBtn, activeTab === 'meetups' && styles.segmentBtnActive]} onPress={() => setActiveTab('meetups')} activeOpacity={0.8}>
              <Text style={[styles.segmentText, activeTab === 'meetups' && styles.segmentTextActive]}>ACTIVE NOW</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.segmentBtn, activeTab === 'campus' && styles.segmentBtnActive]} onPress={() => setActiveTab('campus')} activeOpacity={0.8}>
              <Text style={[styles.segmentText, activeTab === 'campus' && styles.segmentTextActive]}>EVENTS</Text>
            </TouchableOpacity>
          </View>
          
          
          {activeTab === 'meetups' && (
            <View>
              <SpotlightMap meetups={meetups} theme={C} />

              {meetups.map(meetup => (
                <View key={meetup.id} style={[styles.meetupCard, { marginBottom: 16 }]}>
                  <Text style={styles.meetupTitle}>{meetup.title}</Text>
                  {meetup.description && <Text style={styles.meetupDescText} numberOfLines={2}>{meetup.description}</Text>}
                  <View style={styles.meetupFooterRow}>
                    <MapPin size={16} color={C.onSurfaceVariant} />
                    <Text style={styles.meetupFooterLoc}>{meetup.location.toUpperCase()}</Text>
                  </View>
                  <View style={styles.meetupFooterRow} >
                    <Clock size={14} color={C.onSurfaceVariant} />
                    <Text style={styles.meetupFooterLoc}>{formatEventTime(meetup.meetup_time)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <View style={[styles.pillOutline, { backgroundColor: C.tertiaryAlpha }]}>
                      <Text style={[styles.pillLabel, { color: C.tertiary }]}>{meetup.attendee_count} / {meetup.max_capacity} GOING</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {(user?.id === meetup.creator_id || profile?.role === 'admin') && (
                        <>
                          <TouchableOpacity style={styles.deleteBtnSmall} onPress={() => openEditModal(meetup)}>
                            <Text style={styles.deleteBtnSmallText}>EDIT</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.deleteBtnSmall} onPress={() => handleDeleteMeetup(meetup.id)}>
                            <Text style={styles.deleteBtnSmallText}>END</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity
                        style={[styles.joinBtnSmall, meetup.am_attending && styles.joinBtnSmallActive]}
                        onPress={() => handleJoinMeetup(meetup.id)}
                      >
                        <Text style={[styles.joinBtnSmallText, meetup.am_attending && { color: C.onPrimary }]}>
                          {meetup.am_attending ? 'JOINED ✓' : 'JOIN MEETUP'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
              {meetups.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No active meetups.</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'campus' && (
            <View>

              {campusEvents.map(event => (
                <View key={event.id} style={[styles.meetupCard, { width: '100%', marginBottom: 16 }]}>
                  <View style={{ flexDirection: isTablet ? 'row' : 'column' }}>
                    {event.imagePath && (
                      <View style={isTablet ? { width: 120, marginRight: 16 } : { width: '100%', height: 180, marginBottom: 16 }}>
                        <Image source={{ uri: `https://se-images.campuslabs.com/clink/images/${event.imagePath}?preset=med-sq` }} style={{ width: '100%', height: '100%', borderRadius: 10 }} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.meetupTitle}>{event.name}</Text>
                      <View style={styles.meetupFooterRow}>
                        <MapPin size={16} color={C.onSurfaceVariant} />
                        <Text style={styles.meetupFooterLoc}>{event.location || 'Rutgers University'}</Text>
                      </View>
                      <View style={styles.meetupFooterRow} >
                        <Clock size={14} color={C.onSurfaceVariant} />
                        <Text style={styles.meetupFooterLoc}>{new Date(event.startsOn).toLocaleString()}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
              {campusEvents.length === 0 && (
                <View style={styles.emptyState}>
                  <ActivityIndicator color={C.primary} size="large" />
                </View>
              )}
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {user && activeTab === 'meetups' && (
        <TouchableOpacity style={styles.fabBtn} onPress={() => { setEditMeetupId(null); setNewTitle(''); setNewLocation(''); setNewCampus(''); setNewDesc(''); setShowModal(true); }} activeOpacity={0.85}>
          <Plus size={32} color={C.onPrimary} />
        </TouchableOpacity>
      )}

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
        <ScrollView style={styles.modalBg} contentContainerStyle={styles.modalInner} keyboardShouldPersistTaps="handled">
          <View style={styles.modalTopBar}>
            <Text style={styles.modalTitleText}>{editMeetupId ? 'Edit Meetup' : 'Create Meetup'}</Text>
            <TouchableOpacity onPress={() => setShowModal(false)} style={{ padding: 8 }}>
              <X size={24} color={C.onSurface} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalInputLabel}>MEETUP TITLE</Text>
          <TextInput style={styles.modalInputLine} placeholder="Library study group" placeholderTextColor={C.outline} value={newTitle} onChangeText={setNewTitle} />

          <Text style={styles.modalInputLabel}>CAMPUS (OPTIONAL)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {CAMPUSES.map(c => (
              <TouchableOpacity key={c.id} style={[styles.pillOutline, { borderWidth: 1.5, borderColor: C.outlineAlpha }, newCampus === c.name && { backgroundColor: C.primary, borderColor: C.primary }]} onPress={() => setNewCampus(c.name === newCampus ? '' : c.name)}>
                <Text style={[styles.pillLabel, { color: C.onSurfaceVariant }, newCampus === c.name && { color: C.onPrimary }]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.modalInputLabel}>SPECIFIC LOCATION</Text>
          <TextInput style={styles.modalInputLine} placeholder="Alexander Library" placeholderTextColor={C.outline} value={newLocation} onChangeText={setNewLocation} />

          <Text style={styles.modalInputLabel}>DESCRIPTION (OPTIONAL)</Text>
          <TextInput style={[styles.modalInputLine, { height: 100, paddingTop: 16, textAlignVertical: 'top' }]} placeholder="Tell people what to expect..." placeholderTextColor={C.outline} multiline value={newDesc} onChangeText={setNewDesc} />

          <TouchableOpacity style={styles.dealBtn} onPress={handleSaveMeetup} disabled={creating}>
            <Text style={styles.dealBtnLabel}>{creating ? 'SAVING...' : editMeetupId ? 'SAVE CHANGES' : 'DEAL IT OUT'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const createStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 48, alignItems: 'center' },
  maxWidthContainer: { width: '100%', maxWidth: 672, flex: 1 },
  headerBox: { marginBottom: 16, alignItems: 'center' },
  eyebrow: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 2, color: C.primary, textTransform: 'uppercase' },
  pageTitle: { fontFamily: F.display, fontSize: 44, lineHeight: 48, color: C.onSurface, letterSpacing: -1 },
  blurbBox: { marginBottom: 24, paddingHorizontal: 16, alignItems: 'center' },
  blurbText: { fontFamily: F.body, fontSize: 13, color: C.onSurfaceVariant, textAlign: 'center', lineHeight: 20 },
  segmentControl: { flexDirection: 'row', backgroundColor: C.surfaceContainerLow, borderRadius: 12, padding: 4, marginBottom: 12, width: '100%' },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  segmentBtnActive: { backgroundColor: C.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  segmentText: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 1, color: C.onSurfaceVariant },
  segmentTextActive: { color: C.primary },
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
