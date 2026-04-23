import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const GENDER_PREFS = ['Men', 'Women', 'Everyone'];

export default function PreferencesScreen() {
    const { theme: C } = useTheme();
    const styles = createStyles(C);
    const { user, refreshProfile } = useAuth();
    const router = useRouter();

    const [datingEnabled, setDatingEnabled] = useState(false);
    const [friendsEnabled, setFriendsEnabled] = useState(true);
    const [genderPreference, setGenderPreference] = useState('Everyone');
    const [saving, setSaving] = useState(false);

    const handleFinish = async () => {
        if (!friendsEnabled && !datingEnabled) {
            Alert.alert('Select at Least One', 'Please enable at least one mode to continue.');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    dating_enabled: datingEnabled,
                    friends_enabled: friendsEnabled,
                    gender_preference: datingEnabled ? genderPreference : null,
                    onboarding_completed: true,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user?.id);

            if (error) throw error;

            await refreshProfile();
            // Root layout will detect onboarding_completed and redirect to tabs
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.stepRow}>
                    {[1, 2, 3, 4, 5].map(s => (
                        <View key={s} style={[styles.stepDot, s <= 5 && styles.stepDotActive]} />
                    ))}
                </View>

                <Text style={styles.eyebrow}>STEP 5 OF 5</Text>
                <Text style={styles.title}>Your Table.</Text>
                <Text style={styles.subtitle}>Choose how you want to connect with others at Rutgers.</Text>

                <View style={styles.divider} />

                {/* Friends Mode */}
                <TouchableOpacity
                    style={[styles.modeCard, friendsEnabled && styles.modeCardActive]}
                    onPress={() => setFriendsEnabled(!friendsEnabled)}
                    activeOpacity={0.8}
                >
                    <View style={styles.modeCardHeader}>
                        <View style={[styles.modeIcon, friendsEnabled && styles.modeIconActive]}>
                            <Text style={styles.modeIconText}>👋</Text>
                        </View>
                        <View style={[styles.checkbox, friendsEnabled && styles.checkboxActive]}>
                            {friendsEnabled && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                    </View>
                    <Text style={[styles.modeTitle, friendsEnabled && styles.modeTitleActive]}>Friends</Text>
                    <Text style={styles.modeDesc}>
                        Swipe to find study buddies, workout partners, and new friends on campus.
                    </Text>
                </TouchableOpacity>

                {/* Dating Mode */}
                <TouchableOpacity
                    style={[styles.modeCard, datingEnabled && styles.modeCardActiveDating]}
                    onPress={() => setDatingEnabled(!datingEnabled)}
                    activeOpacity={0.8}
                >
                    <View style={styles.modeCardHeader}>
                        <View style={[styles.modeIcon, datingEnabled && styles.modeIconActiveDating]}>
                            <Text style={styles.modeIconText}>💝</Text>
                        </View>
                        <View style={[styles.checkbox, datingEnabled && styles.checkboxActiveDating]}>
                            {datingEnabled && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                    </View>
                    <Text style={[styles.modeTitle, datingEnabled && styles.modeTitleActiveDating]}>Dating</Text>
                    <Text style={styles.modeDesc}>
                        Find your person at Rutgers. Match with students who share your vibe.
                    </Text>
                </TouchableOpacity>

                {/* Gender Preference (only if dating enabled) */}
                {datingEnabled && (
                    <View style={styles.prefSection}>
                        <Text style={styles.label}>Show Me</Text>
                        <View style={styles.pillContainer}>
                            {GENDER_PREFS.map(p => (
                                <TouchableOpacity
                                    key={p}
                                    style={[styles.pill, genderPreference === p && styles.pillActive]}
                                    onPress={() => setGenderPreference(p)}
                                >
                                    <Text style={[styles.pillText, genderPreference === p && styles.pillTextActive]}>{p}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Disclaimer */}
                <View style={styles.disclaimerBox}>
                    <Text style={styles.disclaimerText}>
                        ♦ You can always change these preferences in{' '}
                        <Text style={{ fontWeight: '700', color: C.primary }}>Settings</Text>.
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.button, saving && styles.buttonDisabled]}
                    onPress={handleFinish}
                    disabled={saving}
                >
                    <Text style={styles.buttonText}>{saving ? 'Setting up...' : 'Join Full House'}</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const createStyles = (C: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.surface },
    scrollContent: { padding: 24, paddingTop: Platform.OS === 'ios' ? 70 : 56, paddingBottom: 40 },
    stepRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
    stepDot: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.outlineAlpha },
    stepDotActive: { backgroundColor: C.primary },
    eyebrow: { fontSize: 10, letterSpacing: 3, fontWeight: '700', color: C.tertiary, textTransform: 'uppercase', marginBottom: 8 },
    title: { fontSize: 40, fontWeight: '800', color: C.onSurface, marginBottom: 8, letterSpacing: -1 },
    subtitle: { fontSize: 16, color: C.secondary, marginBottom: 8 },
    divider: { height: 1, backgroundColor: C.outlineAlpha, marginVertical: 24 },
    modeCard: {
        backgroundColor: C.card, borderRadius: 20, padding: 24,
        marginBottom: 16, borderWidth: 2, borderColor: C.outlineAlpha,
    },
    modeCardActive: { borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.04)' },
    modeCardActiveDating: { borderColor: C.primary, backgroundColor: 'rgba(175,16,26,0.04)' },
    modeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modeIcon: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: C.outlineAlpha, alignItems: 'center', justifyContent: 'center',
    },
    modeIconActive: { backgroundColor: 'rgba(59,130,246,0.15)' },
    modeIconActiveDating: { backgroundColor: 'rgba(175,16,26,0.12)' },
    modeIconText: { fontSize: 24 },
    checkbox: {
        width: 28, height: 28, borderRadius: 8, borderWidth: 2,
        borderColor: 'rgba(228,190,186,0.6)', alignItems: 'center', justifyContent: 'center',
    },
    checkboxActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
    checkboxActiveDating: { backgroundColor: C.primary, borderColor: C.primary },
    checkmark: { color: C.card, fontSize: 16, fontWeight: '800' },
    modeTitle: { fontSize: 24, fontWeight: '800', color: C.onSurface, marginBottom: 4 },
    modeTitleActive: { color: '#3b82f6' },
    modeTitleActiveDating: { color: C.primary },
    modeDesc: { fontSize: 14, color: C.secondary, lineHeight: 20 },
    prefSection: { marginTop: 8, marginBottom: 16 },
    label: { color: C.onSurfaceVariant, fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.5 },
    pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    pill: {
        paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20,
        borderWidth: 1.5, borderColor: C.outlineAlpha, backgroundColor: C.card,
    },
    pillActive: { backgroundColor: C.primary, borderColor: C.primary },
    pillText: { color: C.secondary, fontSize: 14, fontWeight: '600' },
    pillTextActive: { color: C.card },
    disclaimerBox: {
        backgroundColor: 'rgba(112,93,0,0.06)', borderRadius: 12,
        padding: 16, marginVertical: 24,
    },
    disclaimerText: { fontSize: 13, color: C.tertiary, textAlign: 'center', lineHeight: 20 },
    button: {
        backgroundColor: C.primary, height: 56, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    },
    buttonDisabled: { backgroundColor: '#c8b0af' },
    buttonText: { color: C.card, fontSize: 16, fontWeight: '700', letterSpacing: 2 },
});
