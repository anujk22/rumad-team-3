import { useAuth } from '@/hooks/useAuth';
import { useQueue } from '@/hooks/useQueue';
import { C, F } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ArrowRight, GraduationCap, Search } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Svg, { G, Polygon } from 'react-native-svg';

const CustomDiamond = ({ size = 24, color = C.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <G fill={color}>
      <Polygon points="11,2 11,11 2,11" />
      <Polygon points="13,2 13,11 22,11" />
      <Polygon points="3,13 11,13 11,21 6.5,21" />
      <Polygon points="21,13 13,13 13,21 17.5,21" />
    </G>
  </Svg>
);

function FannedCards() {
  return (
    <View style={fanStyles.container}>
      <View style={[fanStyles.cardBase, fanStyles.cardBackground]} />
      <View style={[fanStyles.cardBase, fanStyles.cardForeground]}>
        <View style={fanStyles.topLeft}>
          <Text style={fanStyles.cardRank}>K</Text>
          <CustomDiamond size={20} color={C.primary} />
        </View>
        <View style={fanStyles.centerContent}>
          <Text style={fanStyles.joinLabel}>JOIN THE TABLE</Text>
          <Text style={fanStyles.promptText}>Ready for a{'\n'}random chat?</Text>
        </View>
        <View style={fanStyles.bottomRight}>
          <CustomDiamond size={20} color={C.primary} />
          <Text style={fanStyles.cardRank}>K</Text>
        </View>
      </View>
    </View>
  );
}

const fanStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', height: 310, marginBottom: 16, position: 'relative' },
  cardBase: { width: 200, height: 290, borderRadius: 16, position: 'absolute', borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
  cardBackground: { backgroundColor: C.surfaceContainerHighest, transform: [{ rotate: '5deg' }], shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, top: 15 },
  cardForeground: { backgroundColor: C.surfaceContainerLowest, transform: [{ rotate: '-2deg' }], shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 6, padding: 16, justifyContent: 'space-between' },
  topLeft: { alignSelf: 'flex-start', alignItems: 'center' },
  bottomRight: { alignSelf: 'flex-end', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  cardRank: { fontFamily: F.headlineBase, fontSize: 26, lineHeight: 28, color: C.primary },
  centerContent: { alignItems: 'center', gap: 8 },
  joinLabel: { fontFamily: F.label, fontSize: 10, color: C.secondary, letterSpacing: 0.5, textTransform: 'uppercase' },
  promptText: { fontFamily: F.headlineBase, fontSize: 20, color: C.onSurface, textAlign: 'center', lineHeight: 24 },
});

export default function DiscoverScreen() {
  const { user } = useAuth();
  const { status, joinQueue, leaveQueue } = useQueue();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [tags, setTags] = useState<{ id: string; name: string; emoji: string }[]>([]);

  const dealBtnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    const { data } = await supabase.from('tags').select('*').order('name').limit(8);
    if (data) setTags(data);
  };

  const handleDealPress = async () => {
    Animated.sequence([
      Animated.timing(dealBtnScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.spring(dealBtnScale, { toValue: 1, tension: 60, friction: 5, useNativeDriver: true }),
    ]).start();

    if (status === 'idle') {
      await joinQueue();
    } else if (status === 'queued') {
      await leaveQueue();
    }
  };

  const handleStudyCrewSubmit = async () => {
    if (!courseCode.trim() || !user) return;
    // Create or join study crew chat
    const code = courseCode.trim().toUpperCase();
    const { data: existing } = await supabase
      .from('chats')
      .select('id')
      .eq('type', 'study_crew')
      .eq('metadata->>course_code', code)
      .single();

    if (existing) {
      // Join existing
      await supabase.from('chat_participants').upsert({ chat_id: existing.id, user_id: user.id });
      router.push(`/chat/${existing.id}` as any);
    } else {
      // Create new
      const { data: chat } = await supabase
        .from('chats')
        .insert({ type: 'study_crew', name: code, metadata: { course_code: code } })
        .select()
        .single();
      if (chat) {
        await supabase.from('chat_participants').insert({ chat_id: chat.id, user_id: user.id });
        router.push(`/chat/${chat.id}` as any);
      }
    }
    setCourseCode('');
  };

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.maxWidthContainer, { width: isTablet ? 672 : '100%' }]}>
          <Text style={styles.mainTitle}>Discover</Text>
          <FannedCards />

          <Animated.View style={{ transform: [{ scale: dealBtnScale }], marginBottom: 12 }}>
            <TouchableOpacity
              style={[styles.dealBtn, status === 'queued' && styles.dealBtnQueued]}
              activeOpacity={0.85}
              onPress={handleDealPress}
            >
              <MaterialCommunityIcons name="cards-playing-outline" size={20} color={C.onPrimary} />
              <Text style={styles.dealBtnText}>
                {status === 'queued' ? 'Leave Queue' : 'Deal Me In'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.dealSubtext}>
            {status === 'queued' ? 'FINDING YOUR TABLE...' : 'MATCH WITH 3–6 STUDENTS INSTANTLY'}
          </Text>

          {/* Interests */}
          <View style={styles.sectionMarginInterests}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionHeader}>Interests</Text>
            </View>
            <View style={styles.searchBarBox}>
              <Search size={20} color={C.secondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search interests (e.g., Cooking, CS)"
                placeholderTextColor={C.secondary}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Tags grid */}
          <View style={styles.tagsGrid}>
            {tags
              .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()))
              .map(tag => (
                <TouchableOpacity key={tag.id} style={styles.tagChip} activeOpacity={0.8}>
                  <Text style={styles.tagChipEmoji}>{tag.emoji}</Text>
                  <Text style={styles.tagChipText}>{tag.name}</Text>
                </TouchableOpacity>
              ))}
          </View>

          {/* Study Crews */}
          <View style={styles.crewContainer}>
            <View style={styles.crewWatermark}>
              <GraduationCap size={100} color={C.primary} opacity={0.05} />
            </View>
            <Text style={styles.crewTitle}>Study Crews</Text>
            <Text style={styles.crewBody}>Input your course code to find your peers.</Text>
            <View style={styles.crewInputRow}>
              <TextInput
                style={styles.crewInput}
                placeholder="e.g. CS101, PSYCH202"
                placeholderTextColor={C.secondary}
                value={courseCode}
                onChangeText={setCourseCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.crewSubmitBtn} onPress={handleStudyCrewSubmit}>
                <ArrowRight size={20} color={C.surfaceContainerLowest} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surfaceContainer },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 32, alignItems: 'center' },
  maxWidthContainer: { width: '100%', maxWidth: 672, flex: 1 },
  mainTitle: { fontFamily: F.headlineSub, fontSize: 48, color: C.onSurface, lineHeight: 52, letterSpacing: -1, marginBottom: 20 },
  dealBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  dealBtnQueued: { backgroundColor: C.onSurface },
  dealBtnText: { fontFamily: F.headlineBase, color: C.onPrimary, fontSize: 22, letterSpacing: 0, marginTop: 2 },
  dealSubtext: { fontFamily: F.label, textAlign: 'center', fontSize: 9, color: C.secondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionMarginInterests: { marginTop: 48, width: '100%' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 },
  sectionHeader: { fontFamily: F.headlineBase, fontSize: 26, color: C.onSurface, letterSpacing: -0.5 },
  searchBarBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceContainerLowest, borderRadius: 16, paddingHorizontal: 16, height: 54, borderWidth: 1, borderColor: 'rgba(228,190,186,0.3)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontFamily: F.body, fontSize: 15, color: C.onSurface, height: '100%' },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16, marginBottom: 24 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surfaceContainerLowest, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(228,190,186,0.3)' },
  tagChipEmoji: { fontSize: 16 },
  tagChipText: { fontFamily: F.label, fontSize: 12, color: C.onSurface },
  crewContainer: { backgroundColor: C.surfaceContainerLowest, borderRadius: 24, padding: 24, marginTop: 16, position: 'relative', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: 'rgba(228,190,186,0.3)' },
  crewWatermark: { position: 'absolute', top: 10, right: 10 },
  crewTitle: { fontFamily: F.headlineBase, fontSize: 28, color: C.onSurface, marginBottom: 8 },
  crewBody: { fontFamily: F.body, fontSize: 14, color: C.secondary, marginBottom: 24 },
  crewInputRow: { flexDirection: 'row', position: 'relative' },
  crewInput: { flex: 1, backgroundColor: C.surfaceContainer, color: C.onSurface, fontFamily: F.label, fontSize: 14, height: 52, borderRadius: 12, paddingLeft: 16, paddingRight: 60, borderWidth: 1, borderColor: 'rgba(228,190,186,0.3)' },
  crewSubmitBtn: { position: 'absolute', right: 6, top: 6, width: 40, height: 40, borderRadius: 10, backgroundColor: C.tertiary, alignItems: 'center', justifyContent: 'center' },
});
