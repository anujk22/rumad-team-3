import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const GENDERS = ['Man', 'Woman', 'Non-binary', 'Prefer not to say'];
const PRONOUNS = ['he/him', 'she/her', 'they/them', 'he/they', 'she/they', 'Other'];

export default function ProfileSetupScreen() {
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
                        placeholderTextColor="#8f6f6c"
                        value={firstName}
                        onChangeText={setFirstName}
                    />

                    <Text style={styles.label}>Age</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="19"
                        placeholderTextColor="#8f6f6c"
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcf9f8' },
    scrollContent: { padding: 24, paddingTop: Platform.OS === 'ios' ? 70 : 56, paddingBottom: 40 },
    stepRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
    stepDot: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(228,190,186,0.5)' },
    stepDotActive: { backgroundColor: '#af101a' },
    eyebrow: {
        fontSize: 10, letterSpacing: 3, fontWeight: '700',
        color: '#705d00', textTransform: 'uppercase', marginBottom: 8,
    },
    title: { fontSize: 40, fontWeight: '800', color: '#1b1c1c', marginBottom: 8, letterSpacing: -1 },
    subtitle: { fontSize: 16, color: '#5f5e5e', marginBottom: 8 },
    divider: { height: 1, backgroundColor: 'rgba(228,190,186,0.4)', marginVertical: 24 },
    form: { marginBottom: 32 },
    label: {
        color: '#5b403d', fontSize: 12, fontWeight: '600',
        marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.5,
    },
    optional: { color: '#8f6f6c', fontWeight: '400', textTransform: 'none', letterSpacing: 0 },
    input: {
        backgroundColor: '#ffffff', color: '#1b1c1c', height: 56,
        borderRadius: 14, paddingHorizontal: 18, fontSize: 16,
        marginBottom: 24, borderWidth: 1.5, borderColor: 'rgba(228,190,186,0.4)',
    },
    pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    pill: {
        paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20,
        borderWidth: 1.5, borderColor: 'rgba(228,190,186,0.5)', backgroundColor: '#ffffff',
    },
    pillActive: { backgroundColor: '#af101a', borderColor: '#af101a' },
    pillText: { color: '#5f5e5e', fontSize: 14, fontWeight: '600' },
    pillTextActive: { color: '#ffffff' },
    button: {
        backgroundColor: '#af101a', height: 56, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#af101a', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    },
    buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
});
