import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const GENDERS = ['Man', 'Woman', 'Non-binary', 'Prefer not to say'];
const PRONOUNS = ['he/him', 'she/her', 'they/them', 'he/they', 'she/they', 'Other'];

export default function ProfileSetupScreen() {
    const { theme: C } = useTheme();
    const styles = createStyles(C);
    const { user } = useAuth();
    const router = useRouter();

    const [firstName, setFirstName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [selectedPronoun, setSelectedPronoun] = useState('');

    const handleContinue = async () => {
        if (!firstName.trim()) {
            Alert.alert('Required', 'Please enter your first name.');
            return;
        }
        if (!age || isNaN(Number(age)) || Number(age) < 16 || Number(age) > 99) {
            Alert.alert('Invalid Age', 'Please enter a valid age (16–99).');
            return;
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    first_name: firstName.trim(),
                    age: parseInt(age),
                    gender: gender || null,
                    pronouns: selectedPronoun || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user?.id);

            if (error) throw error;
            router.push('/(setup)/details');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save profile.');
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Step indicator */}
                <View style={styles.stepRow}>
                    {[1, 2, 3, 4, 5].map(s => (
                        <View key={s} style={[styles.stepDot, s === 1 && styles.stepDotActive]} />
                    ))}
                </View>

                <Text style={styles.eyebrow}>STEP 1 OF 5</Text>
                <Text style={styles.title}>The Basics.</Text>
                <Text style={styles.subtitle}>Let's get to know you.</Text>

                <View style={styles.divider} />

                <View style={styles.form}>
                    <Text style={styles.label}>First Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="What should we call you?"
                        placeholderTextColor={C.outline}
                        value={firstName}
                        onChangeText={setFirstName}
                    />

                    <Text style={styles.label}>Age</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="19"
                        placeholderTextColor={C.outline}
                        keyboardType="number-pad"
                        maxLength={2}
                        value={age}
                        onChangeText={setAge}
                    />

                    <Text style={styles.label}>Gender</Text>
                    <View style={styles.pillContainer}>
                        {GENDERS.map(g => (
                            <TouchableOpacity
                                key={g}
                                style={[styles.pill, gender === g && styles.pillActive]}
                                onPress={() => setGender(g)}
                            >
                                <Text style={[styles.pillText, gender === g && styles.pillTextActive]}>{g}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Pronouns <Text style={styles.optional}>(optional)</Text></Text>
                    <View style={styles.pillContainer}>
                        {PRONOUNS.map(p => (
                            <TouchableOpacity
                                key={p}
                                style={[styles.pill, selectedPronoun === p && styles.pillActive]}
                                onPress={() => setSelectedPronoun(selectedPronoun === p ? '' : p)}
                            >
                                <Text style={[styles.pillText, selectedPronoun === p && styles.pillTextActive]}>{p}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity style={styles.button} onPress={handleContinue}>
                    <Text style={styles.buttonText}>Continue</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const createStyles = (C: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.surface },
    scrollContent: { padding: 24, paddingTop: Platform.OS === 'ios' ? 70 : 56, paddingBottom: 40 },
    stepRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
    stepDot: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.outlineAlpha },
    stepDotActive: { backgroundColor: C.primary },
    eyebrow: {
        fontSize: 10, letterSpacing: 3, fontWeight: '700',
        color: C.tertiary, textTransform: 'uppercase', marginBottom: 8,
    },
    title: { fontSize: 40, fontWeight: '800', color: C.onSurface, marginBottom: 8, letterSpacing: -1 },
    subtitle: { fontSize: 16, color: C.secondary, marginBottom: 8 },
    divider: { height: 1, backgroundColor: C.outlineAlpha, marginVertical: 24 },
    form: { marginBottom: 32 },
    label: {
        color: C.onSurfaceVariant, fontSize: 12, fontWeight: '600',
        marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.5,
    },
    optional: { color: C.outline, fontWeight: '400', textTransform: 'none', letterSpacing: 0 },
    input: {
        backgroundColor: C.card, color: C.onSurface, height: 56,
        borderRadius: 14, paddingHorizontal: 18, fontSize: 16,
        marginBottom: 24, borderWidth: 1.5, borderColor: C.outlineAlpha,
    },
    pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    pill: {
        paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20,
        borderWidth: 1.5, borderColor: C.outlineAlpha, backgroundColor: C.card,
    },
    pillActive: { backgroundColor: C.primary, borderColor: C.primary },
    pillText: { color: C.secondary, fontSize: 14, fontWeight: '600' },
    pillTextActive: { color: C.card },
    button: {
        backgroundColor: C.primary, height: 56, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    },
    buttonText: { color: C.card, fontSize: 16, fontWeight: '700', letterSpacing: 2 },
});
