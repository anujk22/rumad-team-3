import { useTheme } from '@/hooks/useTheme';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Color palette matching the HTML design


export default function WelcomeScreen() {
  const { theme: C } = useTheme();
  const styles = createStyles(C);
  const router = useRouter();

  // Animation values
  const fadeIn = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.85)).current;
  const cardRotate1 = useRef(new Animated.Value(3)).current;
  const cardRotate2 = useRef(new Animated.Value(-2)).current;
  const headlineSlide = useRef(new Animated.Value(40)).current;
  const ctaSlide = useRef(new Animated.Value(40)).current;
  const footerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Phase 1: fade in background
      Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
      // Phase 2: card pop
      Animated.parallel([
        Animated.spring(cardScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(cardRotate1, { toValue: 3, duration: 600, useNativeDriver: true }),
        Animated.timing(cardRotate2, { toValue: -2, duration: 600, useNativeDriver: true }),
      ]),
      // Phase 3: headline + CTA slide up
      Animated.parallel([
        Animated.timing(headlineSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(ctaSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(footerFade, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const rot1 = cardRotate1.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] });
  const rot2 = cardRotate2.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />

      {/* Background blobs */}
      <View style={[styles.blob, styles.blobTopLeft]} />
      <View style={[styles.blob, styles.blobBottomRight]} />

      {/* Watermark FH */}
      <Text style={styles.watermark} numberOfLines={1}>FH</Text>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View style={[styles.inner, { opacity: fadeIn }]}>

          {/* ── Stacked Card Logo ── */}
          <Animated.View style={[styles.cardStack, { transform: [{ scale: cardScale }] }]}>
            {/* Back card 2 */}
            <Animated.View
              style={[
                styles.cardBack,
                styles.cardBack2,
                { transform: [{ rotate: rot2 }, { translateX: -4 }] },
              ]}
            />
            {/* Back card 1 */}
            <Animated.View
              style={[
                styles.cardBack,
                styles.cardBack1,
                { transform: [{ rotate: rot1 }, { translateX: 4 }, { translateY: 4 }] },
              ]}
            />
            {/* Main card face */}
            <View style={styles.cardFace}>
              <Image
                source={require('../../assets/images/fullhouse_logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          {/* ── Headline ── */}
          <Animated.View
            style={[
              styles.headlineContainer,
              { opacity: fadeIn, transform: [{ translateY: headlineSlide }] },
            ]}
          >
            <Text style={styles.eyebrow}>EXCLUSIVE ACCESS</Text>
            <Text style={styles.headline}>
              Take Your{'\n'}
              <Text style={styles.headlineAccent}>Seat at the Table</Text>
            </Text>
            <Text style={styles.body}>
              A curated collegiate experience for{' '}
              <Text style={styles.bodyBold}>Rutgers students</Text>
              {'. Deal yourself in.'}
            </Text>
          </Animated.View>

          {/* ── CTAs ── */}
          <Animated.View
            style={[
              styles.ctaContainer,
              { opacity: fadeIn, transform: [{ translateY: ctaSlide }] },
            ]}
          >
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/(auth)/signup')}
            >
              <Text style={styles.primaryBtnText}>GET STARTED</Text>
              <View style={styles.btnShine} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.secondaryBtnText}>LOG IN</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Footer ── */}
          <Animated.View style={[styles.footer, { opacity: footerFade }]}>
            <Text style={styles.footerSuits}>♦  ♥  ♣  ♠</Text>
          </Animated.View>

        </Animated.View>
      </ScrollView>

      {/* Bottom gradient bar */}
      <View style={styles.bottomBar}>
        <View style={[styles.bottomBarSegment, { backgroundColor: C.primary }]} />
        <View style={[styles.bottomBarSegment, { backgroundColor: C.tertiary }]} />
        <View style={[styles.bottomBarSegment, { backgroundColor: C.onSurface }]} />
      </View>
    </View>
  );
}

const CARD_W = 192;
const CARD_H = 256;

const createStyles = (C: any) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.surface,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    paddingBottom: 20,
  },
  inner: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },

  // Background decorations
  blob: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  blobTopLeft: {
    top: -80,
    left: -80,
    backgroundColor: C.primaryAlpha,
  },
  blobBottomRight: {
    bottom: -80,
    right: -80,
    backgroundColor: 'rgba(112,93,0,0.05)',
  },
  watermark: {
    position: 'absolute',
    bottom: 32,
    left: -24,
    fontSize: Platform.OS === 'web' ? 240 : 180,
    fontWeight: '900',
    color: C.onSurface,
    opacity: 0.018,
    transform: [{ rotate: '12deg' }],
    pointerEvents: 'none',
  },

  // ── Card Stack ──
  cardStack: {
    width: CARD_W,
    height: CARD_H,
    marginBottom: 48,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBack: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    borderRadius: 16,
  },
  cardBack1: {
    backgroundColor: C.surfaceContainerHighest,
  },
  cardBack2: {
    backgroundColor: C.outlineAlpha,
  },
  cardFace: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 16,
    backgroundColor: C.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: C.outlineAlpha,
    shadowColor: C.onSurface,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 10,
  },
  logo: {
    width: 140,
    height: 140,
  },

  // ── Headline ──
  headlineContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 3.5,
    fontWeight: '700',
    color: C.tertiary,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  headline: {
    fontFamily: 'AbhayaLibre_800ExtraBold',
    fontSize: 52,
    lineHeight: 56,
    color: C.onSurface,
    textAlign: 'center',
    letterSpacing: -1.5,
    marginBottom: 16,
  },
  headlineAccent: {
    color: C.primary,
  },
  body: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 17,
    lineHeight: 26,
    color: C.secondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  bodyBold: {
    fontFamily: 'Manrope_700Bold',
    color: C.onSurface,
  },

  // ── CTAs ──
  ctaContainer: {
    width: '100%',
    gap: 12,
    paddingHorizontal: 0,
    marginBottom: 48,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  primaryBtnText: {
    color: C.onPrimary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 4,
  },
  btnShine: {
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '60%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    transform: [{ skewX: '-20deg' }],
  },
  secondaryBtn: {
    width: '100%',
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(228,190,186,0.25)',
  },
  secondaryBtnText: {
    color: C.onSurface,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 4,
  },

  // ── Footer ──
  footer: {
    alignItems: 'center',
    gap: 6,
  },
  footerSuits: {
    fontSize: 14,
    color: C.onSurface,
    letterSpacing: 6,
    opacity: 0.5,
  },
  footerQuote: {
    fontSize: 14,
    color: C.onSurface,
    fontStyle: 'italic',
    opacity: 0.7,
  },

  // ── Bottom bar ──
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    flexDirection: 'row',
    opacity: 0.3,
  },
  bottomBarSegment: {
    flex: 1,
  },
});
