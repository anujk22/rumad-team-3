import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Heart, Users, Star, X, User } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW } = Dimensions.get('window');

const C = {
  surfaceContainer:        '#f0eded',
  surfaceContainerHigh:    '#eae7e7',
  surfaceContainerLowest:  '#ffffff',
  surfaceContainerHighest: '#e5e2e1',
  outlineVariant:          'rgba(228,190,186,0.3)',
  primary:                 '#af101a',
  onPrimary:               '#ffffff',
  onSurface:               '#1b1c1c',
  onSurfaceVariant:        '#5b403d',
  tertiary:                '#705d00',
  secondary:               '#5f5e5e',
  matchBannerBg:           '#e7e2d9',
};

const F = {
  headlineBase: 'AbhayaLibre_800ExtraBold',
  label: 'PlusJakartaSans_700Bold',
  body: 'Manrope_400Regular',
};

const SWIPE_THRESHOLD = SW * 0.28;

type Profile = {
  id: string;
  first_name: string;
  age: number;
  major: string;
  avatar_urls: string[];
  tags: string[];
};

const MOCK_PROFILES: Profile[] = [
  {
    id: 'u1', first_name: 'Jane', age: 21,
    major: 'Visual Arts @ Rutgers Mason Gross',
    avatar_urls: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80'],
    tags: ['MUSEUMS', 'VINYL', 'THRIFTING'],
  },
  {
    id: 'u2', first_name: 'Michael', age: 22,
    major: 'Finance @ RBS',
    avatar_urls: ['https://images.unsplash.com/photo-1549471156-52ee71691122?w=800&q=80'],
    tags: ['GYM', 'GOLF', 'INVESTING'],
  },
  {
    id: 'u3', first_name: 'Jessica', age: 20,
    major: 'Computer Science @ SAS',
    avatar_urls: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80'],
    tags: ['CODING', 'BOBA', 'ANIME'],
  },
];

function SwipeCard({
  profile,
  isTop,
  zIndex,
  onSwipe,
}: {
  profile: Profile;
  isTop: boolean;
  zIndex: number;
  onSwipe: (dir: 'left' | 'right') => void;
}) {
  const pos = useRef(new Animated.ValueXY()).current;

  const rotate = pos.x.interpolate({
    inputRange: [-SW / 2, 0, SW / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTop,
      onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) {
          Animated.timing(pos, {
            toValue: { x: SW * 1.5, y: g.dy },
            duration: 220,
            useNativeDriver: true,
          }).start(() => onSwipe('right'));
        } else if (g.dx < -SWIPE_THRESHOLD) {
          Animated.timing(pos, {
            toValue: { x: -SW * 1.5, y: g.dy },
            duration: 220,
            useNativeDriver: true,
          }).start(() => onSwipe('left'));
        } else {
          Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        cStyles.card,
        { zIndex },
        isTop && {
          transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }],
        },
      ]}
      {...(isTop ? pan.panHandlers : {})}
    >
      <View style={cStyles.photoWrap}>
        {/* Photo Image */}
        <Image
          source={{ uri: profile.avatar_urls[0] }}
          style={cStyles.photo}
          resizeMode="cover"
        />

        {/* Gradient Overlay for Text Readability */}
        {/* If expo-linear-gradient is not compiled, falls back to raw views */}
        <View style={cStyles.scrimWrap}>
           <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']}
            style={StyleSheet.absoluteFill}
           />
        </View>

        {/* Bio overlay */}
        <View style={cStyles.bio}>
          <View style={cStyles.nameRow}>
            <Text style={cStyles.name}>{profile.first_name}, {profile.age}</Text>
            <MaterialCommunityIcons name="check-decagram" size={24} color={C.primary} />
          </View>
          <Text style={cStyles.major}>{profile.major}</Text>
          <View style={cStyles.tagsRow}>
            {profile.tags.map((tag, i) => (
              <View key={i} style={cStyles.tag}>
                <Text style={cStyles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const cStyles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 24,
    borderWidth: 8, // Thick white border natively matching image
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 8,
    overflow: 'hidden',
  },
  photoWrap: {
    flex: 1,
    borderRadius: 16, // Inner image radius rounding safely inside the white border
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: C.surfaceContainerHighest, // fallback placeholder color
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  scrimWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%', // Lower half gradient matching image depth
  },
  bio: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontFamily: F.headlineBase, // Abhaya Libre ExtraBold per instruction
    fontSize: 34,
    color: '#fff',
    lineHeight: 38,
  },
  major: {
    fontFamily: F.body, // Manrope
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagText: {
    fontFamily: F.label, // Plus Jakarta Sans Bold
    fontSize: 10,
    letterSpacing: 0.5,
    color: '#fff',
  },
});

export default function SwipeScreen() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'dating' | 'friends'>('dating');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [topIndex, setTopIndex] = useState(0);
  const [matchName, setMatchName] = useState<string | null>(null);

  // Match pulse
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!matchName) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [matchName]);

  useEffect(() => { load(); }, [mode]);

  const load = async () => {
    setLoading(true);
    setTopIndex(0);
    try {
      if (!user) { setProfiles(MOCK_PROFILES); return; }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, age, major, avatar_urls, user_tags(tags(name))')
        .neq('id', user.id)
        .limit(10);
      if (error || !data?.length) { setProfiles(MOCK_PROFILES); return; }
      setProfiles(data.map((p: any) => ({
        id: p.id, first_name: p.first_name, age: p.age, major: p.major,
        avatar_urls: p.avatar_urls || [],
        tags: p.user_tags?.map((ut: any) => ut.tags?.name?.toUpperCase() ?? '') ?? [],
      })));
    } catch { setProfiles(MOCK_PROFILES); }
    finally { setLoading(false); }
  };

  const handleSwipe = async (cardIdx: number, dir: 'left' | 'right') => {
    const swiped = profiles[cardIdx];
    if (dir === 'right' && swiped) {
      if (Math.random() > 0.45) setMatchName(swiped.first_name);
      if (user) {
        await supabase.from('swipes').upsert({
          swiper_id: user.id, swiped_id: swiped.id, is_right_swipe: true,
        }).select();
      }
    }
    setTopIndex(prev => prev + 1);
  };

  const visible = profiles.slice(topIndex, topIndex + 3);
  const isEmpty = !loading && visible.length === 0;

  return (
    <View style={styles.root}>
      {/* ── Mode toggle pill ── */}
      <View style={styles.modeRow}>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'dating' && styles.modeBtnActiveDating]}
            onPress={() => { setMode('dating'); setMatchName(null); }}
            activeOpacity={0.85}
          >
            <Heart size={14} color={mode === 'dating' ? '#fff' : C.onSurfaceVariant} fill={mode === 'dating' ? '#fff' : 'transparent'} />
            <Text style={[styles.modeBtnLabel, mode === 'dating' && styles.modeBtnLabelActive]}>
              DATING
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'friends' && styles.modeBtnActiveFriends]}
            onPress={() => { setMode('friends'); setMatchName(null); }}
            activeOpacity={0.85}
          >
            <Users size={14} color={mode === 'friends' ? '#fff' : C.onSurfaceVariant} />
            <Text style={[styles.modeBtnLabel, mode === 'friends' && styles.modeBtnLabelActive]}>
              FRIENDS
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Card deck area ── */}
      {/* Container aspect bounds fit the thick layered card layout tightly. */}
      <View style={styles.deckWrapperBounds}>
        <View style={styles.deckWrapper}>
          {loading ? (
            <ActivityIndicator color={C.primary} size="large" />
          ) : isEmpty ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="cards-playing" size={56} color={C.onSurfaceVariant} />
              <Text style={styles.emptyTitle}>Deck's empty.</Text>
              <TouchableOpacity style={styles.reshuffleBtn} onPress={load}>
                <Text style={styles.reshuffleBtnText}>RESHUFFLE</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Background stacking shadow card (single drop behind) */}
              <View style={styles.stackCardShadow} />
              
              {/* Render bottom → top so top card handles touches naturally */}
              {[...visible].reverse().map((p, revIdx) => {
                const stackIdx = visible.length - 1 - revIdx;
                return (
                  <SwipeCard
                    key={p.id}
                    profile={p}
                    isTop={stackIdx === 0}
                    zIndex={100 + stackIdx}
                    onSwipe={(dir) => handleSwipe(topIndex + stackIdx, dir)}
                  />
                );
              })}
            </>
          )}
        </View>
      </View>

      {/* ── Action controls ── */}
      {!loading && !isEmpty && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtnWhite} activeOpacity={0.85} onPress={() => handleSwipe(topIndex, 'left')}>
            <X size={28} color={C.onSurface} strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtnStar} activeOpacity={0.85}>
            <Star size={20} color={C.tertiary} fill={C.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtnPrimary} activeOpacity={0.85} onPress={() => handleSwipe(topIndex, 'right')}>
            <Heart size={26} color="#fff" fill="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Match Notification Banner ── */}
      {matchName && (
        <Animated.View style={[styles.matchBanner, { opacity: pulse }]}>
          <TouchableOpacity style={styles.matchBannerInner} onPress={() => setMatchName(null)} activeOpacity={0.9}>
            <View style={styles.matchAvatars}>
              <View style={styles.matchAvatar}>
                <User size={16} color={C.surfaceContainerHighest} strokeWidth={2.5} />
              </View>
              <View style={[styles.matchAvatar, styles.matchAvatarOverlap]}>
                <User size={16} color={C.surfaceContainerHighest} strokeWidth={2.5} />
              </View>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.matchTitle}>IT'S A FULL HOUSE</Text>
              <Text style={styles.matchBody}>
                You matched with {matchName}! Deal the first card.
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Extra bottom padding to clear tabs safely */}
      <View style={{ height: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.surfaceContainer,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },

  modeRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: C.surfaceContainerHigh, // Muted pill background
    borderRadius: 999,
    padding: 6,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
  },
  modeBtnActiveDating: {
    backgroundColor: C.primary,
  },
  modeBtnActiveFriends: {
    backgroundColor: '#3b82f6', // Placeholder if friends had distinct color, else fallback
  },
  modeBtnLabel: {
    fontFamily: F.label, // Plus Jakarta Sans Bold
    fontSize: 11,
    letterSpacing: 2,
    color: C.onSurfaceVariant,
    paddingTop: 1,
  },
  modeBtnLabelActive: {
    color: '#fff',
  },

  deckWrapperBounds: {
    width: '100%',
    flex: 1,
    maxHeight: 520,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
    maxWidth: 400, // Caps size on tablet/desktop view naturally
  },
  stackCardShadow: {
    position: 'absolute',
    width: '98%',
    height: '100%',
    left: '1%',
    top: 10, // Creates that clean bottom lip shadow stack matching screenshot
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: `${C.outlineVariant}1A`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
    zIndex: 1,
  },

  emptyState: { alignItems: 'center', gap: 12, marginTop: '50%' },
  emptyTitle: { fontFamily: F.headlineBase, fontSize: 26, color: C.onSurface, letterSpacing: -0.5 },
  reshuffleBtn: { backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 16, borderRadius: 999, marginTop: 4 },
  reshuffleBtnText: { fontFamily: F.label, color: '#fff', letterSpacing: 2, fontSize: 11 },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  actionBtnWhite: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  actionBtnStar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  actionBtnPrimary: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },

  matchBanner: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: C.matchBannerBg, // Warm tan
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 8,
  },
  matchBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  matchAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  matchAvatarOverlap: {
    marginLeft: -8, // Tightly overlapping
  },
  matchTitle: {
    fontFamily: F.label, // Plus Jakarta Sans Bold
    fontSize: 9,
    letterSpacing: 1.5,
    color: C.tertiary,
    textTransform: 'uppercase',
  },
  matchBody: {
    fontFamily: F.body, // Manrope
    fontSize: 13,
    color: C.onSurface,
    marginTop: 2,
  },
});
