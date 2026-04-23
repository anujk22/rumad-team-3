import { useTheme } from '@/hooks/useTheme';
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

type Meetup = {
  id: string; title: string; location: string; description: string | null;
  meetup_time: string; max_capacity: number; image_url: string | null;
  creator_id: string; created_at: string;
  profiles: { first_name: string };
  attendee_count: number;
  am_attending: boolean;
};

export default function MeetupsScreen() {
    const { theme: C } = useTheme();
    const styles = createStyles(C);
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchMeetups(); }, []);

  const fetchMeetups = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('meetups')
        .select('*, profiles!creator_id(first_name)')
        .gte('meetup_time', new Date(Date.now() - 3600000 * 2).toISOString()) // show active + recent
        .order('meetup_time', { ascending: true });

      if (error) throw error;

      // Get attendee counts and user's attendance
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

        enriched.push({
          ...m,
          attendee_count: count || 0,
          am_attending: isAttending,
        });
      }

      setMeetups(enriched);
    } catch (err) {
      console.error('Error fetching meetups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (meetupId: string) => {
    if (!user) return;
    const meetup = meetups.find(m => m.id === meetupId);
    if (!meetup) return;

    if (meetup.am_attending) {
      // Leave
      await supabase.from('meetup_attendees').delete().eq('meetup_id', meetupId).eq('user_id', user.id);
    } else {
      if (meetup.attendee_count >= meetup.max_capacity) {
        Alert.alert('Full House', 'This meetup is at full capacity!');
        return;
      }
      await supabase.from('meetup_attendees').insert({ meetup_id: meetupId, user_id: user.id });
    }
    await fetchMeetups();
  };

  const handleDelete = async (meetupId: string) => {
    Alert.alert(
      'End Meetup',
      'Are you sure you want to end this meetup?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('meetups').delete().eq('id', meetupId);
              if (error) throw error;
              await fetchMeetups();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newLocation.trim() || !user) {
      Alert.alert('Required', 'Title and location are required.');
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from('meetups').insert({
        creator_id: user.id,
        title: newTitle.trim(),
        location: newLocation.trim(),
        description: newDesc.trim() || null,
        meetup_time: new Date().toISOString(), // Default to now
        max_capacity: 20,
      });
      if (error) throw error;
      setShowModal(false);
      setNewTitle(''); setNewLocation(''); setNewDesc('');
      await fetchMeetups();
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

  const featured = meetups[0];
  const rest = meetups.slice(1);

  const isHappeningNow = (time: string) => {
    const diff = Date.now() - new Date(time).getTime();
    return diff > -3600000 && diff < 3600000 * 2;
  };

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.maxWidthContainer}>
          <View style={styles.headerBox}>
            <Text style={styles.eyebrow}>THE FLOOR</Text>
            <Text style={styles.pageTitle}>Meetups</Text>
          </View>

          {/* Featured meetup */}
          {featured ? (
            <View style={styles.relativeWrap}>
              {isHappeningNow(featured.meetup_time) && (
                <View style={styles.badgeRoyal}>
                  <MaterialCommunityIcons name="run-fast" size={12} color={C.onTertiary} />
                  <Text style={styles.badgeRoyalText}>ACTIVE NOW</Text>
                </View>
              )}
              <View style={styles.featCardContainer}>
                <View style={{ gap: 16 }}>
                  <View style={{ gap: 4 }}>
                    <View style={styles.featSubheadRow}>
                      <Star size={14} color={C.tertiary} fill={C.tertiary} />
                      <Text style={styles.featSubheadText}>{featured.profiles?.first_name || 'Anonymous'}</Text>
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
                      <Text style={styles.featMetaText}>{formatEventTime(featured.meetup_time)}</Text>
                    </View>
                  </View>
                  <View style={styles.featMetaLayer}>
                    <View style={[styles.pillOutline, { backgroundColor: 'rgba(255,218,214,0.3)' }]}>
                      <Text style={[styles.pillLabel, { color: C.primary }]}>{featured.attendee_count}/{featured.max_capacity} SEATS</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={styles.dealBtn} activeOpacity={0.85} onPress={() => handleJoin(featured.id)}>
                      <Text style={styles.dealBtnLabel}>{featured.am_attending ? "I'M OUT" : "I'M IN"}</Text>
                    </TouchableOpacity>
                    {user?.id === featured.creator_id && (
                      <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.85} onPress={() => handleDelete(featured.id)}>
                        <Text style={styles.deleteBtnLabel}>END</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>
          ) : null}

          {/* Rest of meetups */}
          <View style={styles.meetupGridContainer}>
            <View style={isTablet ? { flexDirection: 'row', flexWrap: 'wrap', gap: 16 } : { flexDirection: 'column', gap: 16 }}>
              {rest.map(meetup => (
                <View key={meetup.id} style={[styles.meetupCard, isTablet ? { flex: 1, minWidth: 280 } : { width: '100%' }]}>
                  <View style={styles.watermarkContainer}>
                    <MaterialCommunityIcons name={isHappeningNow(meetup.meetup_time) ? 'lightning-bolt' : 'clock-outline'} size={72} color={isHappeningNow(meetup.meetup_time) ? C.primary : C.tertiary} style={{ opacity: 0.1 }} />
                  </View>
                  <View style={styles.meetupHeader}>
                    <View style={styles.avatarRow}>
                      <View style={styles.avatarCircle}><User size={16} color="#888" /></View>
                      {meetup.attendee_count > 0 && (
                        <View style={[styles.avatarCircle, { marginLeft: -8, backgroundColor: C.surfaceContainerHighest }]}>
                          <Text style={styles.avatarCount}>+{meetup.attendee_count}</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.pillOutline, { backgroundColor: isHappeningNow(meetup.meetup_time) ? 'rgba(255,218,214,0.3)' : 'rgba(255,225,109,0.3)' }]}>
                      <Text style={[styles.pillLabel, { color: isHappeningNow(meetup.meetup_time) ? C.primary : C.tertiary }]}>
                        {isHappeningNow(meetup.meetup_time) ? 'ACTIVE' : formatEventTime(meetup.meetup_time).toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.meetupBody}>
                    <Text style={styles.meetupTitle}>{meetup.title}</Text>
                    <Text style={styles.meetupDescText} numberOfLines={2}>{meetup.description}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={styles.meetupFooterRow}>
                      <MapPin size={16} color={C.onSurfaceVariant} />
                      <Text style={styles.meetupFooterLoc}>{meetup.location.toUpperCase()}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {user?.id === meetup.creator_id && (
                        <TouchableOpacity
                          style={styles.deleteBtnSmall}
                          onPress={() => handleDelete(meetup.id)}
                        >
                          <Text style={styles.deleteBtnSmallText}>END</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.joinBtnSmall, meetup.am_attending && styles.joinBtnSmallActive]}
                        onPress={() => handleJoin(meetup.id)}
                      >
                        <Text style={[styles.joinBtnSmallText, meetup.am_attending && { color: C.card }]}>
                          {meetup.am_attending ? "I'M IN ✓" : "JOIN"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {meetups.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="run" size={56} color={`${C.onSurface}25`} />
              <Text style={styles.emptyTitle}>The floor is empty.</Text>
              <Text style={styles.emptyBody}>Be the first to start a meetup!</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fabBtn} onPress={() => setShowModal(true)} activeOpacity={0.85}>
        <Plus size={32} color={C.onPrimary} />
      </TouchableOpacity>

      {/* Create meetup modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
        <ScrollView style={styles.modalBg} contentContainerStyle={styles.modalInner} keyboardShouldPersistTaps="handled">
          <View style={styles.modalTopBar}>
            <Text style={styles.modalTitleText}>Start a Meetup</Text>
            <TouchableOpacity onPress={() => setShowModal(false)} style={{ padding: 8 }}>
              <X size={24} color={C.onSurface} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalInputLabel}>MEETUP TITLE</Text>
          <TextInput style={styles.modalInputLine} placeholder="Library study group" placeholderTextColor={C.outline} value={newTitle} onChangeText={setNewTitle} />

          <Text style={styles.modalInputLabel}>LOCATION</Text>
          <TextInput style={styles.modalInputLine} placeholder="Alexander Library" placeholderTextColor={C.outline} value={newLocation} onChangeText={setNewLocation} />

          <Text style={styles.modalInputLabel}>DESCRIPTION</Text>
          <TextInput style={[styles.modalInputLine, { height: 100, paddingTop: 16, textAlignVertical: 'top' }]} placeholder="What's happening?" placeholderTextColor={C.outline} multiline value={newDesc} onChangeText={setNewDesc} />

          <TouchableOpacity style={styles.dealBtn} onPress={handleCreate} disabled={creating}>
            <Text style={styles.dealBtnLabel}>{creating ? 'CREATING...' : 'START NOW'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const createStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surfaceContainerHigh },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 8, alignItems: 'center' },
  maxWidthContainer: { width: '100%', maxWidth: 672, flex: 1 },
  headerBox: { marginBottom: 28 },
  eyebrow: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 2, color: C.primary, textTransform: 'uppercase' },
  pageTitle: { fontFamily: F.display, fontSize: 48, lineHeight: 52, color: C.onSurface, letterSpacing: -1 },
  relativeWrap: { position: 'relative', marginBottom: 24 },
  badgeRoyal: { position: 'absolute', top: -12, right: 0, backgroundColor: '#dbc118', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, zIndex: 10, transform: [{ rotate: '3deg' }], shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  badgeRoyalText: { fontFamily: F.labelExtra, fontSize: 10, color: '#1b1c1c', fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  featCardContainer: { backgroundColor: '#ffffff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 30, elevation: 3, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.05)' },
  featSubheadRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featSubheadText: { fontFamily: F.labelExtra, fontSize: 12, letterSpacing: 1.5, color: '#a38c1a' },
  featTitleText: { fontFamily: F.display, fontSize: 32, color: C.onSurface, lineHeight: 36 },
  featDescText: { fontFamily: F.body, fontSize: 14, color: C.onSurfaceVariant, lineHeight: 22 },
  featMetaLayer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 4, marginBottom: 4 },
  featMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featMetaText: { fontFamily: F.bodyBold, fontSize: 11, color: C.onSurfaceVariant },
  pillOutline: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pillLabel: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 0.5 },
  dealBtn: { flex: 1, backgroundColor: C.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  dealBtnLabel: { fontFamily: F.labelExtra, color: C.card, fontSize: 14, letterSpacing: 2 },
  deleteBtn: { backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 20, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 4, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)' },
  deleteBtnLabel: { fontFamily: F.labelExtra, color: '#1b1c1c', fontSize: 14, letterSpacing: 2 },
  meetupGridContainer: { marginBottom: 32, gap: 16 },
  meetupCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 2, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden', minHeight: 200, justifyContent: 'space-between' },
  watermarkContainer: { position: 'absolute', top: 16, right: 16, zIndex: 0 },
  meetupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, zIndex: 1 },
  avatarRow: { flexDirection: 'row' },
  avatarCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: C.card, backgroundColor: C.surfaceContainerLow, justifyContent: 'center', alignItems: 'center' },
  avatarCount: { fontFamily: F.labelExtra, fontSize: 10, color: C.onSurface },
  meetupBody: { flex: 1, justifyContent: 'flex-start', zIndex: 1 },
  meetupTitle: { fontFamily: F.display, fontSize: 22, marginBottom: 8, color: C.onSurface },
  meetupDescText: { fontFamily: F.body, fontSize: 12, lineHeight: 18, color: C.onSurfaceVariant, marginBottom: 16 },
  meetupFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1 },
  meetupFooterLoc: { fontFamily: F.labelExtra, fontSize: 10, textTransform: 'uppercase', color: C.onSurfaceVariant, letterSpacing: 0.5 },
  joinBtnSmall: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: C.primary },
  joinBtnSmallActive: { backgroundColor: C.primary, borderColor: C.primary },
  joinBtnSmallText: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 1, color: C.primary },
  deleteBtnSmall: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)', backgroundColor: 'rgba(0,0,0,0.02)' },
  deleteBtnSmallText: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 1, color: '#1b1c1c' },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontFamily: F.display, fontSize: 22, color: `${C.onSurface}99` },
  emptyBody: { fontFamily: F.body, fontSize: 14, color: C.secondary },
  fabBtn: { position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 24, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 8 },
  modalBg: { flex: 1, backgroundColor: C.surfaceContainerLowest },
  modalInner: { padding: 24, paddingBottom: 48 },
  modalTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitleText: { fontFamily: F.display, fontSize: 26, color: C.onSurface, letterSpacing: -0.8 },
  modalInputLabel: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 2, color: C.onSurfaceVariant, textTransform: 'uppercase', marginBottom: 8 },
  modalInputLine: { fontFamily: F.body, backgroundColor: C.surfaceContainerLowest, color: C.onSurface, borderRadius: 14, height: 56, paddingHorizontal: 18, fontSize: 16, marginBottom: 20, borderWidth: 1.5, borderColor: C.outlineAlpha },
});
