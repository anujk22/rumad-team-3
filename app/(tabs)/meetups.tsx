import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Clock, Image as ImageIcon, MapPin, Plus, Star, User, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

const C = {
  surfaceContainer: '#f0eded',
  surfaceContainerLow: '#f6f3f2',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerHighest: '#e5e2e1',
  outlineVariant: 'rgba(228,190,186,0.2)',
  outline: '#8f6f6c',
  primary: '#af101a',
  onSurface: '#1b1c1c',
  onSurfaceVariant: '#5b403d',
  tertiary: '#705d00',
  onTertiary: '#ffffff',
};

// Precise Fonts mappings explicitly loaded in _layout.tsx Google Fonts config
const F = {
  headline: 'AbhayaLibre_800ExtraBold',
  body: 'Manrope_400Regular',
  bodyBold: 'Manrope_700Bold',
  label: 'PlusJakartaSans_700Bold',
  labelExtra: 'PlusJakartaSans_800ExtraBold',
};

type Meetup = {
  id: string;
  title: string;
  location: string;
  description: string;
  meetup_time: string;
  poster_url: string;
  is_active: boolean; // instead of verified org
  creator: { first_name: string };
};

const MOCK_MEETUPS: Meetup[] = [
  {
    id: 'm1',
    title: 'Pop-up Chess & Matcha',
    location: 'Yard Quad (Under the big oak)',
    description: "Brought 2 boards and matcha powder. Just chill vibes, anyone can jump in for a blitz game.",
    meetup_time: new Date(Date.now() + 1800000).toISOString(), // Happening soon
    poster_url: 'https://images.unsplash.com/photo-1588693892708-2e06cdd19aa7?w=800&q=80',
    is_active: true,
    creator: { first_name: 'Daniel' },
  },
  {
    id: 'm2',
    title: 'Late Night Run (3 Miles)',
    location: 'College Ave Gym',
    description: "Pacing around 8:30 min/mile. We're stretching outside the doors.",
    meetup_time: new Date(Date.now() - 3600000).toISOString(),
    poster_url: '',
    is_active: true,
    creator: { first_name: 'Mike' },
  },
  {
    id: 'm3',
    title: 'CS 314 Cram Session',
    location: 'Hill Center Lounge',
    description: "Reviewing graph algos. Bring notes, we have whiteboards.",
    meetup_time: new Date().toISOString(),
    poster_url: '',
    is_active: true,
    creator: { first_name: 'Sarah' },
  },
  {
    id: 'm4',
    title: 'Sunset Yoga Flow',
    location: 'Voorhees Mall',
    description: "Grounding session before finals week. Bring your own mat and an open mind.",
    meetup_time: new Date().toISOString(),
    poster_url: '',
    is_active: true,
    creator: { first_name: 'Jessica' },
  }
];

export default function MeetupsScreen() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [posterPhoto, setPosterPhoto] = useState<string | null>(null);

  useEffect(() => {
    // Fake loading for transition effect parity with Events
    setTimeout(() => { setLoading(false); }, 400);
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [3, 4], quality: 0.8, base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setPosterPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surfaceContainer, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  // Slice mock data to fit the exact identical grid format constraint
  const featured = MOCK_MEETUPS[0];
  const secondaryMeetups = MOCK_MEETUPS.slice(1, 4);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.maxWidthContainer}>

          <View style={styles.headerBox}>
            <Text style={styles.eyebrow}>THE FLOOR</Text>
            <Text style={styles.pageTitle}>Meetups</Text>
          </View>

          {/* Featured Top Card Clone */}
          <View style={styles.relativeWrap}>
            <View style={styles.badgeRoyal}>
              <MaterialCommunityIcons name="run-fast" size={12} color={C.onTertiary} />
              <Text style={styles.badgeRoyalText}>ACTIVE NOW</Text>
            </View>

            <View style={styles.featCardContainer}>
              <View style={[styles.featCardContentLayout, isTablet ? { flexDirection: 'row' } : { flexDirection: 'column' as any }]}>
                <View style={[styles.featPosterWrap, isTablet ? { flex: 1 } : { width: '100%', marginBottom: 20 }]}>
                  <Image
                    source={{ uri: featured.poster_url }}
                    style={styles.featPosterImg}
                  />
                </View>

                <View style={[styles.featTextWrap, isTablet ? { flex: 2 } : { width: '100%' }]}>
                  <View style={{ gap: 4 }}>
                    <View style={styles.featSubheadRow}>
                      <Star size={14} color={C.tertiary} fill={C.tertiary} />
                      <Text style={styles.featSubheadText}>{featured.creator.first_name}</Text>
                    </View>
                    <Text style={styles.featTitleText}>{featured.title}</Text>
                  </View>

                  <Text style={styles.featDescText}>{featured.description}</Text>

                  <View style={styles.featMetaLayer}>
                    <View style={styles.featMetaItem}>
                      <MapPin size={18} color={C.onSurfaceVariant} />
                      <Text style={styles.featMetaText}>{featured.location}</Text>
                    </View>
                    <View style={styles.featMetaItem}>
                      <Clock size={18} color={C.onSurfaceVariant} />
                      <Text style={styles.featMetaText}>RIGHT NOW</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.dealBtn} activeOpacity={0.85}>
                    <Text style={styles.dealBtnLabel}>HAPPENING NOW</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Exact Grid Layout Clone */}
          <View style={styles.meetupGridContainer}>
            <View style={isTablet ? { flexDirection: 'row', gap: 16 } : { flexDirection: 'column', gap: 16 }}>

              {/* Grid Item 1 */}
              <View style={[styles.meetupCard, { flex: 1 }]}>
                <View style={styles.watermarkContainer}>
                  <MaterialCommunityIcons name="lightning-bolt" size={72} color={C.primary} style={{ opacity: 0.1 }} />
                </View>
                <View style={styles.meetupHeader}>
                  <View style={styles.avatarRow}>
                    <View style={styles.avatarCircle}><User size={16} color="#888" /></View>
                    <View style={[styles.avatarCircle, { marginLeft: -8 }]}><User size={16} color="#888" /></View>
                    <View style={[styles.avatarCircle, { marginLeft: -8, backgroundColor: C.surfaceContainerHighest }]}>
                      <Text style={styles.avatarCount}>+3</Text>
                    </View>
                  </View>
                  <View style={[styles.pillOutline, { backgroundColor: 'rgba(255,218,214,0.3)' }]}>
                    <Text style={[styles.pillLabel, { color: C.primary }]}>ACTIVE</Text>
                  </View>
                </View>
                <View style={styles.meetupBody}>
                  <Text style={styles.meetupTitle}>{secondaryMeetups[0].title}</Text>
                  <Text style={styles.meetupDescText} numberOfLines={2}>{secondaryMeetups[0].description}</Text>
                </View>
                <View style={styles.meetupFooterRow}>
                  <MapPin size={16} color={C.onSurfaceVariant} />
                  <Text style={styles.meetupFooterLoc}>{secondaryMeetups[0].location}</Text>
                </View>
              </View>

              {/* Grid Item 2 */}
              <View style={[styles.meetupCard, { flex: 1 }]}>
                <View style={styles.watermarkContainer}>
                  <MaterialCommunityIcons name="map-marker-radius" size={72} color={C.tertiary} style={{ opacity: 0.1 }} />
                </View>
                <View style={styles.meetupHeader}>
                  <View style={styles.avatarRow}>
                    <View style={styles.avatarCircle}><User size={16} color="#888" /></View>
                    <View style={[styles.avatarCircle, { marginLeft: -8, backgroundColor: C.surfaceContainerHighest }]}>
                      <Text style={styles.avatarCount}>+6</Text>
                    </View>
                  </View>
                  <View style={[styles.pillOutline, { backgroundColor: 'rgba(255,225,109,0.3)' }]}>
                    <Text style={[styles.pillLabel, { color: C.tertiary }]}>ACTIVE</Text>
                  </View>
                </View>
                <View style={styles.meetupBody}>
                  <Text style={styles.meetupTitle}>{secondaryMeetups[1].title}</Text>
                  <Text style={styles.meetupDescText} numberOfLines={2}>{secondaryMeetups[1].description}</Text>
                </View>
                <View style={styles.meetupFooterRow}>
                  <MapPin size={16} color={C.onSurfaceVariant} />
                  <Text style={styles.meetupFooterLoc}>{secondaryMeetups[1].location}</Text>
                </View>
              </View>
            </View>

            {/* Bottom Horizontal Item */}
            <View style={[styles.meetupCard, { width: '100%', marginTop: 16 }]}>
              <View style={[isTablet ? { flexDirection: 'row', alignItems: 'center' } : { flexDirection: 'column' as any }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ marginBottom: 16, alignSelf: 'flex-start' }}>
                    <View style={[styles.pillOutline, { backgroundColor: 'rgba(255,218,214,0.3)' }]}>
                      <Text style={[styles.pillLabel, { color: C.primary }]}>JUST STARTED</Text>
                    </View>
                  </View>
                  <Text style={[styles.meetupTitle, { fontSize: 24 }]}>{secondaryMeetups[2].title}</Text>
                  <Text style={[styles.meetupDescText, { fontSize: 14, marginBottom: 16 }]}>{secondaryMeetups[2].description}</Text>
                  <View style={[styles.meetupFooterRow, { marginTop: 0, marginBottom: isTablet ? 0 : 20 }]}>
                    <MapPin size={16} color={C.onSurfaceVariant} />
                    <Text style={styles.meetupFooterLoc}>{secondaryMeetups[2].location}</Text>
                  </View>
                </View>
                <View style={isTablet ? { width: 140, marginLeft: 24 } : { width: '100%' }}>
                  {/* Changed "REQUEST SEAT" to "HAPPENING NOW" per requirements */}
                  <TouchableOpacity style={styles.reqBtnBlack} activeOpacity={0.85}>
                    <Text style={styles.reqBtnBlackLabel}>HAPPENING NOW</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.footerDashed}>
            <MaterialCommunityIcons name="run" size={42} color={`${C.onSurface}25`} style={{ marginBottom: 8 }} />
            <Text style={styles.footerDashedHead}>The floor is open.</Text>
            <Text style={styles.footerDashedSub}>SCROLL FOR MORE MEETUPS</Text>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Identical Action Button and Form Modal matched to Events */}
      <TouchableOpacity style={styles.fabBtn} onPress={() => setShowModal(true)} activeOpacity={0.85}>
        <Plus size={32} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
        <ScrollView style={styles.modalBg} contentContainerStyle={styles.modalInner} keyboardShouldPersistTaps="handled">
          <View style={styles.modalTopBar}>
            <Text style={styles.modalTitleText}>Start a Meetup</Text>
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
                <Text style={{ fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 2, color: C.onSurfaceVariant }}>TAP TO UPLOAD PHOTO (OPTIONAL)</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.modalInputLabel}>MEETUP TITLE</Text>
          <TextInput style={styles.modalInputLine} placeholder="Library study group" placeholderTextColor={C.outline} value={newTitle} onChangeText={setNewTitle} />

          <Text style={styles.modalInputLabel}>LOCATION</Text>
          <TextInput style={styles.modalInputLine} placeholder="Alexander Library" placeholderTextColor={C.outline} value={newLocation} onChangeText={setNewLocation} />

          <Text style={styles.modalInputLabel}>DESCRIPTION</Text>
          <TextInput style={[styles.modalInputLine, { height: 100, paddingTop: 16, textAlignVertical: 'top' }]} placeholder="What's happening?" placeholderTextColor={C.outline} multiline value={newDesc} onChangeText={setNewDesc} />

          <TouchableOpacity style={styles.dealBtn} onPress={() => setShowModal(false)}>
            <Text style={styles.dealBtnLabel}>START NOW</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

    </View>
  );
}

// Exactly copied stylesheet from events.tsx to preserve absolute 1:1 continuity 
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surfaceContainer },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 8, alignItems: 'center' },
  maxWidthContainer: { width: '100%', maxWidth: 672, flex: 1 },

  headerBox: { marginBottom: 28 },
  eyebrow: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 2, color: C.primary, textTransform: 'uppercase' },
  pageTitle: { fontFamily: F.headline, fontSize: 48, lineHeight: 52, color: C.onSurface, letterSpacing: -1 },

  relativeWrap: { position: 'relative', marginBottom: 24 },
  badgeRoyal: { position: 'absolute', top: -12, right: 0, backgroundColor: C.tertiary, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, zIndex: 10, transform: [{ rotate: '3deg' }], shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  badgeRoyalText: { fontFamily: F.labelExtra, fontSize: 10, color: C.onTertiary, letterSpacing: 1, textTransform: 'uppercase' },
  featCardContainer: { backgroundColor: C.surfaceContainerLowest, borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 2, borderWidth: 1, borderColor: C.outlineVariant },
  featCardContentLayout: { gap: 24 },
  featPosterWrap: { aspectRatio: 3 / 4, borderRadius: 10, overflow: 'hidden', transform: [{ rotate: '-2deg' }], shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, backgroundColor: C.surfaceContainerHighest },
  featPosterImg: { width: '100%', height: '100%' },
  featTextWrap: { justifyContent: 'center', gap: 16 },
  featSubheadRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featSubheadText: { fontFamily: F.labelExtra, fontSize: 12, letterSpacing: 1.5, color: C.tertiary },
  featTitleText: { fontFamily: F.headline, fontSize: 32, color: C.onSurface, lineHeight: 36 },
  featDescText: { fontFamily: F.body, fontSize: 14, color: C.onSurfaceVariant, lineHeight: 22 },
  featMetaLayer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 4, marginBottom: 4 },
  featMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featMetaText: { fontFamily: F.bodyBold, fontSize: 11, color: C.onSurfaceVariant },
  dealBtn: { backgroundColor: C.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', width: '100%', marginTop: 4 },
  dealBtnLabel: { fontFamily: F.labelExtra, color: '#fff', fontSize: 14, letterSpacing: 2 },

  meetupGridContainer: { marginBottom: 32, gap: 16 },
  meetupCard: { backgroundColor: C.surfaceContainerLowest, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: C.outlineVariant, position: 'relative', overflow: 'hidden', minHeight: 220, justifyContent: 'space-between' },
  watermarkContainer: { position: 'absolute', top: 16, right: 16, zIndex: 0 },
  meetupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, zIndex: 1 },
  avatarRow: { flexDirection: 'row' },
  avatarCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#fff', backgroundColor: C.surfaceContainerLow, justifyContent: 'center', alignItems: 'center' },
  avatarCount: { fontFamily: F.labelExtra, fontSize: 10, color: C.onSurface },
  pillOutline: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pillLabel: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 0.5 },
  meetupBody: { flex: 1, justifyContent: 'flex-start', zIndex: 1 },
  meetupTitle: { fontFamily: F.headline, fontSize: 22, color: C.onSurface, marginBottom: 8 },
  meetupDescText: { fontFamily: F.body, fontSize: 12, lineHeight: 18, color: C.onSurfaceVariant, marginBottom: 16 },
  meetupFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 'auto', zIndex: 1 },
  meetupFooterLoc: { fontFamily: F.labelExtra, fontSize: 10, textTransform: 'uppercase', color: C.onSurfaceVariant, letterSpacing: 0.5 },

  reqBtnBlack: { backgroundColor: C.onSurface, paddingVertical: 14, borderRadius: 10, alignItems: 'center', width: '100%' },
  reqBtnBlackLabel: { fontFamily: F.labelExtra, color: '#fff', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },

  footerDashed: { backgroundColor: C.surfaceContainerLow, borderRadius: 16, borderWidth: 1.5, borderColor: C.outlineVariant, borderStyle: 'dashed', padding: 32, alignItems: 'center' },
  footerDashedHead: { fontFamily: F.headline, fontSize: 18, color: `${C.onSurface}99` },
  footerDashedSub: { fontFamily: F.labelExtra, fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: `${C.onSurface}66`, marginTop: 4 },

  fabBtn: { position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 24, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 8 },

  modalBg: { flex: 1, backgroundColor: C.surfaceContainerLowest },
  modalInner: { padding: 24, paddingBottom: 48 },
  modalTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitleText: { fontFamily: F.headline, fontSize: 26, color: C.onSurface, letterSpacing: -0.8 },
  modalImgUploadBox: { width: '100%', height: 260, backgroundColor: C.surfaceContainerLow, borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: C.outlineVariant, borderStyle: 'dashed', marginBottom: 24, alignItems: 'center', justifyContent: 'center' },
  modalInputLabel: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 2, color: C.onSurfaceVariant, textTransform: 'uppercase', marginBottom: 8 },
  modalInputLine: { fontFamily: F.body, backgroundColor: C.surfaceContainerLowest, color: C.onSurface, borderRadius: 14, height: 56, paddingHorizontal: 18, fontSize: 16, marginBottom: 20, borderWidth: 1.5, borderColor: C.outlineVariant },
});
