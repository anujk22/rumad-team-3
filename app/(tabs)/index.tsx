import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Search, ChevronRight, ShieldCheck, Lock, Zap, Heart, Sparkles, Book, Utensils, Music, Dumbbell, ArrowRight, GraduationCap, User } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Polygon, G } from 'react-native-svg';

const C = {
  surface: '#fcf9f8',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f6f3f2',
  surfaceContainer: '#f0eded',
  surfaceContainerHigh: '#eae7e7',
  surfaceContainerHighest: '#e5e2e1',
  outlineVariant: 'rgba(228,190,186,0.5)',
  primary: '#af101a',
  onPrimary: '#ffffff',
  secondary: '#5f5e5e',
  onSurface: '#1b1c1c',
  tertiary: '#705d00',
  onSurfaceVariant: '#5b403d',
  outline: '#8f6f6c',
  onSecondaryContainer: '#636262',
};

const F = {
  headlineBase: 'Newsreader_800ExtraBold',
  headlineSub: 'Newsreader_700Bold',
  headlineReg: 'Newsreader_400Regular',
  label: 'PlusJakartaSans_700Bold',
  labelExtra: 'PlusJakartaSans_800ExtraBold',
  body: 'Manrope_400Regular',
  bodyBold: 'Manrope_700Bold',
};

const CustomDiamond = ({ size = 24, color = C.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <G fill={color}>
      {/* Top Left Triangle */}
      <Polygon points="11,2 11,11 2,11" />
      {/* Top Right Triangle */}
      <Polygon points="13,2 13,11 22,11" />
      {/* Bottom Left Parallelogram */}
      <Polygon points="3,13 11,13 11,21 6.5,21" />
      {/* Bottom Right Parallelogram */}
      <Polygon points="21,13 13,13 13,21 17.5,21" />
    </G>
  </Svg>
);

const CustomBook = ({ size = 24, color = C.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Thick Red Outline */}
    <Path 
      d="M3 6.5C3 4.5 5.5 3 8.5 3C10.5 3 11.5 4 12 4.5C12.5 4 13.5 3 15.5 3C18.5 3 21 4.5 21 6.5V19.5C21 17.5 18.5 16 15.5 16C13.5 16 12.5 17 12 17.5C11.5 17 10.5 16 8.5 16C5.5 16 3 17.5 3 19.5V6.5Z" 
      stroke={color} 
      strokeWidth="2.5"
      strokeLinejoin="round"
      strokeLinecap="round"
      fill="transparent"
    />
    <Path d="M12 4.5V17.5" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    
    {/* 3 Red Lines on Right Page */}
    <Path d="M14.5 8.5C15.5 8 17.5 8 18.5 8.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M14.5 11.5C15.5 11 17.5 11 18.5 11.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M14.5 14.5C15.5 14 17.5 14 18.5 14.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

function FannedCards() {
  return (
    <View style={fanStyles.container}>
      {/* Background stack card */}
      <View style={[fanStyles.cardBase, fanStyles.cardBackground]} />
      
      {/* Foreground card */}
      <View style={[fanStyles.cardBase, fanStyles.cardForeground]}>
        
        {/* Top Left K/Diamond */}
        <View style={fanStyles.topLeft}>
          <Text style={fanStyles.cardRank}>K</Text>
          <CustomDiamond size={20} color={C.primary} />
        </View>

        {/* Center Content */}
        <View style={fanStyles.centerContent}>
          <Text style={fanStyles.joinLabel}>JOIN THE TABLE</Text>
          <Text style={fanStyles.promptText}>Ready for a{'\n'}random chat?</Text>
        </View>

        {/* Bottom Right K/Diamond (It's in a 180deg view, we use the same icon) */}
        <View style={fanStyles.bottomRight}>
          <CustomDiamond size={20} color={C.primary} />
          <Text style={fanStyles.cardRank}>K</Text>
        </View>

      </View>
    </View>
  );
}

const fanStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 310,
    marginBottom: 16,
    position: 'relative',
  },
  cardBase: {
    width: 200,
    height: 290,
    borderRadius: 16,
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  cardBackground: {
    backgroundColor: C.surfaceContainerHighest,
    transform: [{ rotate: '5deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    top: 15,
  },
  cardForeground: {
    backgroundColor: C.surfaceContainerLowest,
    transform: [{ rotate: '-2deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
    padding: 16,
    justifyContent: 'space-between',
  },
  topLeft: {
    alignSelf: 'flex-start',
    alignItems: 'center',
  },
  bottomRight: {
    alignSelf: 'flex-end',
    alignItems: 'center',
    transform: [{ rotate: '180deg' }],
  },
  cardRank: {
    fontFamily: F.headlineBase,
    fontSize: 26,
    lineHeight: 28,
    color: C.primary,
  },
  centerContent: {
    alignItems: 'center',
    gap: 8,
  },
  joinLabel: {
    fontFamily: F.label,
    fontSize: 10,
    color: C.secondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  promptText: {
    fontFamily: F.headlineBase,
    fontSize: 20,
    color: C.onSurface,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default function DiscoverScreen() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const [search, setSearch] = useState('');
  const [courseCode, setCourseCode] = useState('');

  const dealBtnScale = useRef(new Animated.Value(1)).current;

  const handleDealPress = () => {
    Animated.sequence([
      Animated.timing(dealBtnScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.spring(dealBtnScale, { toValue: 1, tension: 60, friction: 5, useNativeDriver: true }),
    ]).start();
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.maxWidthContainer, { width: isTablet ? 672 : '100%' }]}>

          {/* ── Title ── */}
          <Text style={styles.mainTitle}>Discover</Text>

          {/* ── Match Cards Graphic ── */}
          <FannedCards />

          {/* ── Deal Me In CTA ── */}
          <Animated.View style={{ transform: [{ scale: dealBtnScale }], marginBottom: 12 }}>
            <TouchableOpacity
              style={styles.dealBtn}
              activeOpacity={0.85}
              onPress={handleDealPress}
            >
              <MaterialCommunityIcons name="cards-playing-outline" size={20} color={C.onPrimary} />
              <Text style={styles.dealBtnText}>Deal Me In</Text>
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.dealSubtext}>MATCH WITH 4–6 STUDENTS INSTANTLY</Text>


          {/* ── Browse Suits Section ── */}
          <View style={styles.sectionMargin}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionHeader}>Browse Suits</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>VIEW DECK</Text>
              </TouchableOpacity>
            </View>

            {/* 2x2 Grid */}
            <View style={styles.suitsGrid}>
              <View style={styles.suitsRow}>
                {/* Freshman */}
                <TouchableOpacity style={[styles.suitCard, { borderLeftColor: C.primary }]} activeOpacity={0.8}>
                  <Heart size={20} color={C.primary} fill={C.primary} style={{ marginBottom: 12 }} />
                  <Text style={styles.suitTitle}>Freshman</Text>
                  <Text style={styles.suitSub}>12 Tables Open</Text>
                </TouchableOpacity>

                {/* Cooking */}
                <TouchableOpacity style={[styles.suitCard, { borderLeftColor: C.tertiary }]} activeOpacity={0.8}>
                  <Utensils size={20} color={C.tertiary} fill={C.tertiary} style={{ marginBottom: 12 }} />
                  <Text style={styles.suitTitle}>Cooking</Text>
                  <Text style={styles.suitSub}>4 Tables Open</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.suitsRow}>
                {/* Socials */}
                <TouchableOpacity style={[styles.suitCard, { borderLeftColor: C.onSurface }]} activeOpacity={0.8}>
                  <Music size={20} color={C.onSurface} fill={C.onSurface} style={{ marginBottom: 12 }} />
                  <Text style={styles.suitTitle}>Socials</Text>
                  <Text style={styles.suitSub}>28 Tables Open</Text>
                </TouchableOpacity>

                {/* Sports */}
                <TouchableOpacity style={[styles.suitCard, { borderLeftColor: C.outline }]} activeOpacity={0.8}>
                  <Dumbbell size={20} color={C.outline} fill={C.outline} style={{ marginBottom: 12 }} />
                  <Text style={styles.suitTitle}>Sports</Text>
                  <Text style={styles.suitSub}>9 Tables Open</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Study Crews Section (Dark Mode Design) ── */}
          <View style={styles.crewContainer}>
            <View style={styles.crewWatermark}>
               <GraduationCap size={100} color="#ffffff" opacity={0.03} />
            </View>
            
            <Text style={styles.crewTitle}>Study Crews</Text>
            <Text style={styles.crewBody}>Input your course code to find your peers.</Text>

            <View style={styles.crewInputRow}>
              <TextInput
                style={styles.crewInput}
                placeholder="e.g. CS101, PSYCH202"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={courseCode}
                onChangeText={setCourseCode}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.crewSubmitBtn}>
                <ArrowRight size={20} color={C.surfaceContainerLowest} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Horizontal Scroll Pill List */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.crewScroll}>
              <View style={styles.crewPill}>
                <Text style={styles.crewPillLabel}>MATH151</Text>
                <View style={styles.avatarOverlap}>
                   <View style={styles.miniAvatar}><User size={12} color="#fff" /></View>
                   <View style={[styles.miniAvatar, { marginLeft: -8 }]}><User size={12} color="#fff" /></View>
                   <View style={[styles.miniAvatarCount, { marginLeft: -8 }]}><Text style={styles.miniCountText}>+4</Text></View>
                </View>
              </View>

              <View style={styles.crewPill}>
                <Text style={styles.crewPillLabel}>HIST110</Text>
                <View style={styles.avatarOverlap}>
                   <View style={styles.miniAvatar}><User size={12} color="#fff" /></View>
                   <View style={[styles.miniAvatarCount, { marginLeft: -8, backgroundColor: '#3f3f46' }]}><Text style={styles.miniCountText}>+2</Text></View>
                </View>
              </View>
            </ScrollView>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.surfaceContainer,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 32, // More breathing room
    alignItems: 'center',
  },
  maxWidthContainer: {
    width: '100%',
    maxWidth: 672,
    flex: 1,
  },

  mainTitle: {
    fontFamily: F.headlineSub, // Thinner Newsreader per instruction
    fontSize: 48,
    color: C.onSurface,
    lineHeight: 52,
    letterSpacing: -1,
    marginBottom: 20,
  },

  dealBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  dealBtnText: {
    fontFamily: F.headlineBase, // "Deal me in" is in Newsreader as requested
    color: C.onPrimary,
    fontSize: 22,
    letterSpacing: 0,
    marginTop: 2, // optical alignment
  },
  dealSubtext: {
    fontFamily: F.label,
    textAlign: 'center',
    fontSize: 9,
    color: C.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  sectionMargin: {
    marginTop: 48,
    marginBottom: 24,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  sectionHeader: {
    fontFamily: F.headlineBase, // "Interests" is in Newsreader
    fontSize: 26,
    color: C.onSurface,
    letterSpacing: -0.5,
  },
  seeAllText: {
    fontFamily: F.labelExtra,
    fontSize: 10,
    color: C.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  suitsGrid: {
    gap: 16,
  },
  suitsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  suitCard: {
    flex: 1,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  suitTitle: {
    fontFamily: F.headlineBase,
    fontSize: 20,
    color: C.onSurface,
    marginBottom: 4,
  },
  suitSub: {
    fontFamily: F.body,
    fontSize: 12,
    color: C.secondary,
  },

  crewContainer: {
    backgroundColor: '#18181b', // zinc-900 equivalent
    borderRadius: 24,
    padding: 24,
    marginTop: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  crewWatermark: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  crewTitle: {
    fontFamily: F.headlineBase,
    fontSize: 28,
    color: C.surfaceContainerLowest,
    marginBottom: 8,
  },
  crewBody: {
    fontFamily: F.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 24,
  },
  crewInputRow: {
    flexDirection: 'row',
    position: 'relative',
    marginBottom: 24,
  },
  crewInput: {
    flex: 1,
    backgroundColor: '#27272a', // zinc-800
    color: C.surfaceContainerLowest,
    fontFamily: F.label,
    fontSize: 14,
    height: 52,
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 60,
  },
  crewSubmitBtn: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crewScroll: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 4,
  },
  crewPill: {
    backgroundColor: 'rgba(39,39,42,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(63,63,70,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  crewPillLabel: {
    fontFamily: F.labelExtra,
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
  },
  avatarOverlap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#18181b', // match background to simulate inner clip
    backgroundColor: '#3f3f46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarCount: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#18181b',
    backgroundColor: C.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCountText: {
    fontFamily: F.labelExtra,
    fontSize: 9,
    color: C.surfaceContainerLowest,
  },
});
