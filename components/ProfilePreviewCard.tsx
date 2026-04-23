import { useTheme } from '@/hooks/useTheme';
import { C, F, formatHeight } from '@/lib/helpers';
import { Heart, User, Users } from 'lucide-react-native';
import React, { useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SW } = Dimensions.get('window');

type ProfilePreviewProps = {
    firstName: string;
    age?: number | null;
    year: string;
    major: string;
    heightInches: number | null;
    ethnicity: string;
    religion: string;
    bio: string | null;
    avatarUrls?: string[];
    selectedTags: any[];
    overrideImages?: string[];
};

export default function ProfilePreviewCard({
    firstName, age, year, major, heightInches, ethnicity, religion, bio, avatarUrls, selectedTags, overrideImages
}: ProfilePreviewProps) {
    const { theme } = useTheme();
    const styles = createStyles(theme);
    const [mode, setMode] = useState<'dating' | 'friends'>('friends');
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const imagesToUse = overrideImages && overrideImages.length > 0 ? overrideImages : (avatarUrls && avatarUrls.length > 0 ? avatarUrls : []);
    const currentImage = imagesToUse[activeImageIndex] || null;

    const primaryTags = selectedTags.slice(0, 3);
    const secondaryTags = selectedTags.slice(3);

    return (
        <View style={styles.container}>
            {/* Mode Toggle */}
            <View style={styles.modeRow}>
                <View style={styles.modeToggle}>
                    <TouchableOpacity style={[styles.modeBtn, mode === 'dating' && styles.modeBtnActiveDating]} onPress={() => setMode('dating')} activeOpacity={0.85}>
                        <Heart size={14} color={mode === 'dating' ? theme.onPrimary : theme.onSurfaceVariant} fill={mode === 'dating' ? theme.onPrimary : 'transparent'} />
                        <Text style={[styles.modeBtnLabel, mode === 'dating' && styles.modeBtnLabelActive]}>DATING</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modeBtn, mode === 'friends' && styles.modeBtnActiveFriends]} onPress={() => setMode('friends')} activeOpacity={0.85}>
                        <Users size={14} color={mode === 'friends' ? theme.onPrimary : theme.onSurfaceVariant} />
                        <Text style={[styles.modeBtnLabel, mode === 'friends' && styles.modeBtnLabelActive]}>FRIENDS</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* The Card */}
            <View style={styles.cardWrapper}>
                <ScrollView
                    style={styles.card}
                    contentContainerStyle={{ flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* Header Image Section */}
                    <View style={styles.imageSection}>
                        {currentImage ? (
                            <Image source={{ uri: currentImage }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                        ) : (
                            <View style={[StyleSheet.absoluteFillObject, styles.placeholderBody]}>
                                <User size={56} color={theme.outline} />
                            </View>
                        )}

                        {/* Progress Dots */}
                        {imagesToUse.length > 1 && (
                            <View style={styles.progressDotsContainer}>
                                {imagesToUse.map((_, idx) => (
                                    <View key={idx} style={[styles.progressDot, idx === activeImageIndex && styles.progressDotActive]} />
                                ))}
                            </View>
                        )}

                        {/* Tap Zones */}
                        {imagesToUse.length > 1 && (
                            <View style={[StyleSheet.absoluteFillObject, { zIndex: 5 }]}>
                                <TouchableOpacity
                                    style={styles.tapZoneLeft}
                                    onPress={() => setActiveImageIndex(prev => Math.max(0, prev - 1))}
                                    activeOpacity={1}
                                />
                                <TouchableOpacity
                                    style={styles.tapZoneRight}
                                    onPress={() => setActiveImageIndex(prev => Math.min(imagesToUse.length - 1, prev + 1))}
                                    activeOpacity={1}
                                />
                            </View>
                        )}

                        <View style={styles.headerInfo}>
                            <Text style={styles.headerName}>{firstName || 'Your Name'}{age ? `, ${age}` : ''}</Text>

                            {/* Tags */}
                            <View style={styles.tagsContainer}>
                                {year ? (
                                    <View style={styles.tagPill}>
                                        <Text style={styles.tagPillText}>🎓 {year}</Text>
                                    </View>
                                ) : null}
                                {major ? (
                                    <View style={styles.tagPill}>
                                        <Text style={styles.tagPillText}>📚 {major}</Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    </View>

                    {/* Scrollable Content Section */}
                    <View style={styles.contentSection}>
                        {bio ? (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>About Me</Text>
                                <Text style={styles.bioText}>{bio}</Text>
                            </View>
                        ) : null}

                        {(year || major || age || heightInches || ethnicity || religion || secondaryTags.length > 0) ? (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>More Info</Text>
                                <View style={styles.infoGrid}>
                                    {age && (
                                        <View style={styles.infoBadge}><Text style={styles.infoBadgeText}>🎂 {age} yrs</Text></View>
                                    )}
                                    {heightInches && (
                                        <View style={styles.infoBadge}><Text style={styles.infoBadgeText}>📏 {formatHeight(heightInches)}</Text></View>
                                    )}
                                    {ethnicity && (
                                        <View style={styles.infoBadge}><Text style={styles.infoBadgeText}>🌍 {ethnicity}</Text></View>
                                    )}
                                    {religion && (
                                        <View style={styles.infoBadge}><Text style={styles.infoBadgeText}>✨ {religion}</Text></View>
                                    )}
                                    {selectedTags.map((tag, i) => (
                                        <View key={i} style={styles.infoBadge}>
                                            <Text style={styles.infoBadgeText}>{tag.emoji} {tag.name}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ) : null}

                        <View style={{ height: 20 }} />
                    </View>
                </ScrollView>
            </View>
            <Text style={styles.previewHint}>Swipe down inside card to see more</Text>
        </View>
    );
}

const createStyles = (theme: typeof C) => StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 24,
    },
    modeRow: { width: '100%', alignItems: 'center', marginBottom: 16 },
    modeToggle: { flexDirection: 'row', backgroundColor: theme.surfaceContainerHigh, borderRadius: 999, padding: 6, borderWidth: 1, borderColor: theme.outlineAlpha },
    modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 999 },
    modeBtnActiveDating: { backgroundColor: theme.primary },
    modeBtnActiveFriends: { backgroundColor: '#3b82f6' },
    modeBtnLabel: { fontFamily: F.label, fontSize: 11, letterSpacing: 2, color: theme.onSurfaceVariant, paddingTop: 1 },
    modeBtnLabelActive: { color: theme.onPrimary },

    cardWrapper: {
        width: SW * 0.85,
        height: (SW * 0.85) * 1.3,
        maxWidth: 340,
        maxHeight: 442,
        backgroundColor: theme.surfaceContainerLowest,
        borderRadius: 24,
        borderWidth: 6,
        borderColor: theme.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
        overflow: 'hidden',
    },
    card: {
        flex: 1,
        backgroundColor: theme.surfaceContainerHighest,
    },
    imageSection: {
        height: (SW * 0.85) * 1.1,
        maxHeight: 380,
        position: 'relative',
        backgroundColor: theme.surfaceContainerHighest,
    },
    placeholderBody: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.surfaceContainerHigh,
    },
    progressDotsContainer: {
        position: 'absolute', top: 12, left: 16, right: 16,
        flexDirection: 'row', gap: 4, zIndex: 10,
    },
    progressDot: {
        flex: 1, height: 4, borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    progressDotActive: {
        backgroundColor: '#ffffff',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2,
    },
    tapZoneLeft: {
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%', zIndex: 5,
    },
    tapZoneRight: {
        position: 'absolute', right: 0, top: 0, bottom: 0, width: '40%', zIndex: 5,
    },
    headerInfo: {
        position: 'absolute',
        bottom: 24,
        left: 20,
        right: 20,
        zIndex: 10,
    },
    headerName: {
        fontFamily: F.display,
        fontSize: 32,
        color: '#ffffff',
        lineHeight: 36,
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    tagPill: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    tagPillText: {
        fontFamily: F.label,
        fontSize: 10,
        letterSpacing: 0.5,
        color: '#ffffff',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    contentSection: {
        padding: 20,
        backgroundColor: theme.surfaceContainerLowest,
        minHeight: 200,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontFamily: F.labelExtra,
        fontSize: 10,
        letterSpacing: 1.5,
        color: theme.onSurfaceVariant,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    bioText: {
        fontFamily: F.body,
        fontSize: 14,
        color: theme.onSurface,
        lineHeight: 22,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    infoBadge: {
        backgroundColor: theme.surfaceContainerHigh,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.outlineAlpha,
    },
    infoBadgeText: {
        fontFamily: F.bodyBold,
        fontSize: 12,
        color: theme.onSurface,
    },
    previewHint: {
        fontFamily: F.label,
        fontSize: 10,
        letterSpacing: 1,
        color: theme.outline,
        marginTop: 12,
        textTransform: 'uppercase',
    }
});
