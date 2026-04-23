import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Grad', 'Transfer'];
const ETHNICITIES = ['Asian', 'Caucasian', 'Hispanic/Latino', 'Middle Eastern', 'African American / Black', 'Mixed', 'Other', 'Prefer not to say'];
const RELIGIONS = ['Agnostic', 'Atheist', 'Buddhist', 'Catholic', 'Christian', 'Hindu', 'Jewish', 'Muslim', 'Spiritual', 'Unsure', 'Other', 'Prefer not to say'];

const HEIGHT_OPTIONS = (() => {
    const opts: { label: string; value: number }[] = [];
    for (let ft = 4; ft <= 7; ft++) {
        for (let inch = 0; inch < 12; inch++) {
            if (ft === 7 && inch > 0) break;
            opts.push({ label: `${ft}'${inch}"`, value: ft * 12 + inch });
        }
    }
    return opts;
})();

export default function DetailsScreen() {
    const { user } = useAuth();
    const router = useRouter();

    const [year, setYear] = useState('');
    const [major, setMajor] = useState('');
    const [heightInches, setHeightInches] = useState<number | null>(null);
    const [showHeightPicker, setShowHeightPicker] = useState(false);
    const [ethnicity, setEthnicity] = useState('');
    const [religion, setReligion] = useState('');
    const [bio, setBio] = useState('');

    const handleContinue = async () => {
        if (!year) {
            Alert.alert('Required', 'Please select your academic year.');
            return;
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    academic_year: year,
                    major: major.trim() || null,
                    height_inches: heightInches,
                    ethnicity: ethnicity || null,
                    religion: religion || null,
                    bio: bio.trim() || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user?.id);

            if (error) throw error;
            router.push('/(setup)/interests');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save details.');
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>

                <View style={styles.stepRow}>
                    {[1, 2, 3, 4, 5].map(s => (
                        <View key={s} style={[styles.stepDot, s <= 2 && styles.stepDotActive]} />
                    ))}
                </View>

                <Text style={styles.eyebrow}>STEP 2 OF 5</Text>
                <Text style={styles.title}>The Details.</Text>
                <Text style={styles.subtitle}>Help us find your people.</Text>

                <View style={styles.divider} />

                <Text style={styles.label}>Academic Year</Text>
                <View style={styles.pillContainer}>
                    {YEARS.map(y => (
                        <TouchableOpacity
                            key={y}
                            style={[styles.pill, year === y && styles.pillActive]}
                            onPress={() => setYear(y)}
                        >
                            <Text style={[styles.pillText, year === y && styles.pillTextActive]}>{y}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Major <Text style={styles.optional}>(optional)</Text></Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. Computer Science"
                    placeholderTextColor="#8f6f6c"
                    value={major}
                    onChangeText={setMajor}
                />

                <Text style={styles.label}>Height <Text style={styles.optional}>(optional)</Text></Text>
                <View style={styles.heightContainer}>
                    <View style={styles.heightDisplay}>
                        <Text style={styles.heightValueText}>
                            {heightInches ? `${Math.floor(heightInches / 12)}'${heightInches % 12}"` : '—'}
                        </Text>
                        <View style={styles.manualOverride}>
                            <TextInput
                                style={styles.manualInput}
                                placeholder="Inches"
                                keyboardType="number-pad"
                                value={heightInches ? heightInches.toString() : ''}
                                onChangeText={(val) => {
                                    const num = parseInt(val);
                                    if (!val) setHeightInches(null);
                                    else if (!isNaN(num)) setHeightInches(Math.min(Math.max(num, 48), 84));
                                }}
                            />
                            <Text style={styles.manualLabel}>in.</Text>
                        </View>
                    </View>

                    <Slider
                        style={styles.slider}
                        minimumValue={48}
                        maximumValue={84}
                        step={1}
                        value={heightInches || 68}
                        onValueChange={setHeightInches}
                        minimumTrackTintColor="#af101a"
                        maximumTrackTintColor="rgba(228,190,186,0.6)"
                        thumbTintColor="#af101a"
                    />
                    <View style={styles.sliderLabels}>
                        <Text style={styles.sliderLimitText}>4'0"</Text>
                        <Text style={styles.sliderLimitText}>7'0"</Text>
                    </View>
                </View>

                <Text style={styles.label}>Ethnicity <Text style={styles.optional}>(optional)</Text></Text>
                <View style={styles.pillContainer}>
                    {ETHNICITIES.map(e => (
                        <TouchableOpacity
                            key={e}
                            style={[styles.pill, ethnicity === e && styles.pillActive]}
                            onPress={() => setEthnicity(ethnicity === e ? '' : e)}
                        >
                            <Text style={[styles.pillText, ethnicity === e && styles.pillTextActive]}>{e}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Religion <Text style={styles.optional}>(optional)</Text></Text>
                <View style={styles.pillContainer}>
                    {RELIGIONS.map(r => (
                        <TouchableOpacity
                            key={r}
                            style={[styles.pill, religion === r && styles.pillActive]}
                            onPress={() => setReligion(religion === r ? '' : r)}
                        >
                            <Text style={[styles.pillText, religion === r && styles.pillTextActive]}>{r}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Bio <Text style={styles.optional}>(optional)</Text></Text>
                <TextInput
                    style={[styles.input, { height: 100, paddingTop: 16, textAlignVertical: 'top' }]}
                    placeholder="Tell people about yourself..."
                    placeholderTextColor="#8f6f6c"
                    multiline
                    maxLength={300}
                    value={bio}
                    onChangeText={setBio}
                />
                <Text style={styles.charCount}>{bio.length}/300</Text>

                <TouchableOpacity style={styles.button} onPress={handleContinue}>
                    <Text style={styles.buttonText}>Continue</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcf9f8' },
    scrollContent: { padding: 24, paddingTop: Platform.OS === 'ios' ? 52 : 40, paddingBottom: 40 },
    backBtn: { alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 16 },
    backBtnText: { fontSize: 14, color: '#af101a', fontWeight: '700', letterSpacing: 0.5 },
    stepRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
    stepDot: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(228,190,186,0.5)' },
    stepDotActive: { backgroundColor: '#af101a' },
    eyebrow: { fontSize: 10, letterSpacing: 3, fontWeight: '700', color: '#705d00', textTransform: 'uppercase', marginBottom: 8 },
    title: { fontSize: 40, fontWeight: '800', color: '#1b1c1c', marginBottom: 8, letterSpacing: -1 },
    subtitle: { fontSize: 16, color: '#5f5e5e', marginBottom: 8 },
    divider: { height: 1, backgroundColor: 'rgba(228,190,186,0.4)', marginVertical: 24 },
    label: { color: '#5b403d', fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.5 },
    optional: { color: '#8f6f6c', fontWeight: '400', textTransform: 'none', letterSpacing: 0 },
    input: { backgroundColor: '#ffffff', color: '#1b1c1c', height: 56, borderRadius: 14, paddingHorizontal: 18, fontSize: 16, marginBottom: 24, borderWidth: 1.5, borderColor: 'rgba(228,190,186,0.4)' },
    heightContainer: { marginBottom: 32 },
    heightDisplay: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
    heightValueText: { fontSize: 32, fontWeight: '800', color: '#af101a' },
    manualOverride: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    manualInput: { width: 60, height: 40, backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1.5, borderColor: 'rgba(228,190,186,0.4)', textAlign: 'center', fontSize: 14, color: '#1b1c1c' },
    manualLabel: { fontSize: 12, color: '#8f6f6c', fontWeight: '600' },
    slider: { width: '100%', height: 40 },
    sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
    sliderLimitText: { fontSize: 12, color: '#8f6f6c', fontWeight: '600' },
    pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    pill: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(228,190,186,0.5)', backgroundColor: '#ffffff' },
    pillActive: { backgroundColor: '#af101a', borderColor: '#af101a' },
    pillText: { color: '#5f5e5e', fontSize: 14, fontWeight: '600' },
    pillTextActive: { color: '#ffffff' },
    charCount: { fontSize: 12, color: '#8f6f6c', textAlign: 'right', marginTop: -20, marginBottom: 24 },
    button: { backgroundColor: '#af101a', height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', shadowColor: '#af101a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
});
