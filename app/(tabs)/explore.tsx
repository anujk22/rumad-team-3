import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { F } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Heart, User, Users, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SW } = Dimensions.get('window');
const SWIPE_THRESHOLD = SW * 0.28;

type Profile = {
  id: string; first_name: string; age: number; major: string;
  avatar_urls: string[]; tags: string[];
};

function SwipeCard({ profile, isTop, zIndex, onSwipe, theme: C }: {
  profile: Profile; isTop: boolean; zIndex: number; onSwipe: (dir: 'left' | 'right') => void; theme: any;
}) {
  const pos = useRef(new Animated.ValueXY()).current;
  const rotate = pos.x.interpolate({ inputRange: [-SW / 2, 0, SW / 2], outputRange: ['-10deg', '0deg', '10deg'], extrapolate: 'clamp' });

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => isTop,
    onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      if (g.dx > SWIPE_THRESHOLD) {
        Animated.timing(pos, { toValue: { x: SW * 1.5, y: g.dy }, duration: 220, useNativeDriver: true }).start(() => onSwipe('right'));
      } else if (g.dx < -SWIPE_THRESHOLD) {
        Animated.timing(pos, { toValue: { x: -SW * 1.5, y: g.dy }, duration: 220, useNativeDriver: true }).start(() => onSwipe('left'));
      } else {
        Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      }
    },
  })).current;

  return (
    <Animated.View style={[{
      position: 'absolute', width: '100%', height: '100%',
      backgroundColor: C.surfaceContainerLowest, borderRadius: 24,
      borderWidth: 8, borderColor: C.card,
      shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 18, elevation: 8,
      overflow: 'hidden', zIndex,
    }, isTop && { transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }] }]} {...(isTop ? pan.panHandlers : {})}>
      <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', position: 'relative', backgroundColor: C.surfaceContainerHighest }}>
        {profile.avatar_urls[0] ? (
          <Image source={{ uri: profile.avatar_urls[0] }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
            <User size={64} color={C.outline} />
          </View>
        )}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%' }}>
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />
        </View>
        <View style={{ position: 'absolute', bottom: 24, left: 20, right: 20 }}>
          <Text style={{ fontFamily: F.display, fontSize: 34, color: '#ffffff', lineHeight: 38 }}>{profile.first_name}, {profile.age}</Text>
          {profile.major ? <Text style={{ fontFamily: F.body, fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 16 }}>{profile.major}</Text> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {profile.tags.slice(0, 3).map((tag, i) => (
              <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
                <Text style={{ fontFamily: F.label, fontSize: 10, letterSpacing: 0.5, color: '#ffffff' }}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default function SwipeScreen() {
  const { theme: C } = useTheme();
  const styles = createStyles(C);
  const { user, profile: myProfile } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'dating' | 'friends'>('friends');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [topIndex, setTopIndex] = useState(0);
  const [matchName, setMatchName] = useState<string | null>(null);
  const [matchChatId, setMatchChatId] = useState<string | null>(null);

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!matchName) return;
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.6, duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [matchName]);

  useEffect(() => {
    if (myProfile && !myProfile.dating_enabled) setMode('friends');
  }, [myProfile]);

  useEffect(() => { load(); }, [mode, user]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setTopIndex(0);
    setMatchName(null);
    try {
      const { data: swipedData } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', user.id)
        .eq('mode', mode);
      const swipedIds = (swipedData || []).map(s => s.swiped_id);
      swipedIds.push(user.id);

      let query = supabase
        .from('profiles')
        .select('id, first_name, age, major, avatar_urls')
        .eq('onboarding_completed', true)
        .not('id', 'in', `(${swipedIds.join(',')})`)
        .limit(20);

      if (mode === 'dating') {
        query = query.eq('dating_enabled', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      const profilesWithTags: Profile[] = [];
      for (const p of data || []) {
        const { data: tagData } = await supabase
          .from('user_tags')
          .select('tag_id, tags(name)')
          .eq('user_id', p.id);
        profilesWithTags.push({
          ...p,
          avatar_urls: p.avatar_urls || [],
          tags: (tagData || []).map((t: any) => t.tags?.name?.toUpperCase() || ''),
        });
      }
      setProfiles(profilesWithTags);
    } catch (err) {
      console.error('Error loading profiles:', err);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (cardIdx: number, dir: 'left' | 'right') => {
    const swiped = profiles[cardIdx];
    if (!swiped || !user) { setTopIndex(prev => prev + 1); return; }

    await supabase.from('swipes').upsert({
      swiper_id: user.id, swiped_id: swiped.id,
      is_right_swipe: dir === 'right', mode,
    });

    if (dir === 'right') {
      const { data: mutual } = await supabase
        .from('swipes')
        .select('id')
        .eq('swiper_id', swiped.id)
        .eq('swiped_id', user.id)
        .eq('is_right_swipe', true)
        .eq('mode', mode)
        .single();

      if (mutual) {
        const { data: chat } = await supabase
          .from('chats')
          .insert({ type: 'direct', name: null, metadata: { mode } })
          .select()
          .single();

        if (chat) {
          await supabase.from('chat_participants').insert([
            { chat_id: chat.id, user_id: user.id },
            { chat_id: chat.id, user_id: swiped.id },
          ]);
          setMatchName(swiped.first_name);
          setMatchChatId(chat.id);
        }
      }
    }
    setTopIndex(prev => prev + 1);
  };

  const visible = profiles.slice(topIndex, topIndex + 3);
  const isEmpty = !loading && visible.length === 0;
  const showDating = myProfile?.dating_enabled;

  return (
    <View style={styles.root}>
      <View style={styles.modeRow}>
        <View style={styles.modeToggle}>
          {showDating && (
            <TouchableOpacity style={[styles.modeBtn, mode === 'dating' && styles.modeBtnActiveDating]} onPress={() => { setMode('dating'); setMatchName(null); }} activeOpacity={0.85}>
              <Heart size={14} color={mode === 'dating' ? C.onPrimary : C.onSurfaceVariant} fill={mode === 'dating' ? C.onPrimary : 'transparent'} />
              <Text style={[styles.modeBtnLabel, mode === 'dating' && styles.modeBtnLabelActive]}>DATING</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.modeBtn, mode === 'friends' && styles.modeBtnActiveFriends]} onPress={() => { setMode('friends'); setMatchName(null); }} activeOpacity={0.85}>
            <Users size={14} color={mode === 'friends' ? C.onPrimary : C.onSurfaceVariant} />
            <Text style={[styles.modeBtnLabel, mode === 'friends' && styles.modeBtnLabelActive]}>FRIENDS</Text>
          </TouchableOpacity>
        </View>
      </View>

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
              <View style={styles.stackCardShadow} />
              {[...visible].reverse().map((p, revIdx) => {
                const stackIdx = visible.length - 1 - revIdx;
                return (
                  <SwipeCard key={p.id} profile={p} isTop={stackIdx === 0} zIndex={100 + stackIdx} theme={C}
                    onSwipe={(dir) => handleSwipe(topIndex + stackIdx, dir)} />
                );
              })}
            </>
          )}
        </View>
      </View>

      {!loading && !isEmpty && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtnWhite} activeOpacity={0.85} onPress={() => handleSwipe(topIndex, 'left')}>
            <X size={28} color={C.onSurface} strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnPrimary} activeOpacity={0.85} onPress={() => handleSwipe(topIndex, 'right')}>
            <Heart size={26} color={C.onPrimary} fill={C.onPrimary} />
          </TouchableOpacity>
        </View>
      )}

      {matchName && (
        <Animated.View style={[styles.matchBanner, { opacity: pulse }]}>
          <TouchableOpacity style={styles.matchBannerInner} onPress={() => { setMatchName(null); if (matchChatId) router.push(`/chat/${matchChatId}` as any); }} activeOpacity={0.9}>
            <View style={{ flex: 1 }}>
              <Text style={styles.matchTitle}>IT'S A FULL HOUSE</Text>
              <Text style={styles.matchBody}>You matched with {matchName}! Tap to chat.</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
      <View style={{ height: 12 }} />
    </View>
  );
}

const createStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surfaceContainerHigh, alignItems: 'center', paddingHorizontal: 24, paddingTop: 16 },
  modeRow: { width: '100%', alignItems: 'center', marginBottom: 20 },
  modeToggle: { flexDirection: 'row', backgroundColor: C.surfaceContainerHigh, borderRadius: 999, padding: 6 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 999 },
  modeBtnActiveDating: { backgroundColor: C.primary },
  modeBtnActiveFriends: { backgroundColor: '#3b82f6' },
  modeBtnLabel: { fontFamily: F.label, fontSize: 11, letterSpacing: 2, color: C.onSurfaceVariant, paddingTop: 1 },
  modeBtnLabelActive: { color: C.onPrimary },
  deckWrapperBounds: { width: '100%', flex: 1, maxHeight: 520, marginBottom: 16, alignItems: 'center', justifyContent: 'center' },
  deckWrapper: { width: '100%', height: '100%', position: 'relative', maxWidth: 400 },
  stackCardShadow: { position: 'absolute', width: '98%', height: '100%', left: '1%', top: 10, backgroundColor: C.surfaceContainerLowest, borderRadius: 24, borderWidth: 1, borderColor: C.outlineAlpha, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 18, elevation: 4, zIndex: 1 },
  emptyState: { alignItems: 'center', gap: 12, marginTop: '50%' },
  emptyTitle: { fontFamily: F.display, fontSize: 26, color: C.onSurface, letterSpacing: -0.5 },
  reshuffleBtn: { backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 16, borderRadius: 999, marginTop: 4 },
  reshuffleBtnText: { fontFamily: F.label, color: C.onPrimary, letterSpacing: 2, fontSize: 11 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 16 },
  actionBtnWhite: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  actionBtnPrimary: { width: 68, height: 68, borderRadius: 34, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  matchBanner: { width: '100%', borderRadius: 20, backgroundColor: C.surfaceContainerHigh, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginTop: 8 },
  matchBannerInner: { flexDirection: 'row', alignItems: 'center', padding: 18 },
  matchTitle: { fontFamily: F.label, fontSize: 9, letterSpacing: 1.5, color: C.tertiary, textTransform: 'uppercase' },
  matchBody: { fontFamily: F.body, fontSize: 13, color: C.onSurface, marginTop: 2 },
});
