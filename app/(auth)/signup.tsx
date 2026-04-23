import { isRutgersEmail } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const C = {
    surface: '#fcf9f8',
    primary: '#af101a',
    onPrimary: '#ffffff',
    secondary: '#5f5e5e',
    onSurface: '#1b1c1c',
    tertiary: '#705d00',
    onSurfaceVariant: '#5b403d',
    outline: '#8f6f6c',
};

export default function SignupScreen() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSendOtp = async () => {
        const trimmedEmail = email.trim().toLowerCase();

        if (!isRutgersEmail(trimmedEmail)) {
            Alert.alert(
                'Rutgers Only',
                'You must use a valid @rutgers.edu or @scarletmail.rutgers.edu email to join Full House.'
            );
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: trimmedEmail,
                options: {
                    shouldCreateUser: true,
                },
            });

            if (error) {
                Alert.alert('Error', error.message);
            } else {
                router.push({
                    pathname: '/(auth)/verify-otp',
                    params: { email: trimmedEmail, isNewUser: 'true' },
                });
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.root}
        >
            <StatusBar barStyle="dark-content" backgroundColor={C.surface} />

            <View style={[styles.blob, styles.blobTopLeft]} />
            <View style={[styles.blob, styles.blobBottomRight]} />

            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>

                <View style={styles.content}>
                    <Text style={styles.eyebrow}>DEAL YOURSELF IN</Text>
                    <Text style={styles.headline}>Create Account</Text>
                    <Text style={styles.subtext}>
                        Enter your Rutgers email and we'll send you a verification code.
                    </Text>

                    <View style={styles.divider} />

                    <Text style={styles.label}>Rutgers Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="NetID@scarletmail.rutgers.edu"
                        placeholderTextColor={C.outline}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={email}
                        onChangeText={setEmail}
                    />

                    <TouchableOpacity
                        style={[
                            styles.primaryBtn,
                            !email && styles.primaryBtnDisabled,
                        ]}
                        onPress={handleSendOtp}
                        disabled={loading || !email}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color={C.onPrimary} />
                        ) : (
                            <Text style={styles.primaryBtnText}>SEND VERIFICATION CODE</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkBtn}
                        onPress={() => router.push('/(auth)/login')}
                    >
                        <Text style={styles.linkBtnText}>
                            Already have an account?{' '}
                            <Text style={styles.linkBtnAccent}>Log In</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <View style={styles.bottomBar}>
                <View style={[styles.bottomBarSegment, { backgroundColor: C.primary }]} />
                <View style={[styles.bottomBarSegment, { backgroundColor: C.tertiary }]} />
                <View style={[styles.bottomBarSegment, { backgroundColor: C.onSurface }]} />
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fcf9f8' },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
    blob: { position: 'absolute', width: 280, height: 280, borderRadius: 140 },
    blobTopLeft: { top: -60, left: -60, backgroundColor: 'rgba(175,16,26,0.05)' },
    blobBottomRight: { bottom: -60, right: -60, backgroundColor: 'rgba(112,93,0,0.05)' },
    backBtn: {
        marginTop: Platform.OS === 'ios' ? 60 : 48,
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 2,
    },
    backBtnText: { fontSize: 15, color: '#af101a', fontWeight: '600', letterSpacing: 0.3 },
    content: { flex: 1, marginTop: 32 },
    eyebrow: {
        fontSize: 11, letterSpacing: 3.5, fontWeight: '700',
        color: '#705d00', textTransform: 'uppercase', marginBottom: 10,
    },
    headline: { fontSize: 38, fontWeight: '800', color: '#1b1c1c', letterSpacing: -1, marginBottom: 8 },
    subtext: { fontSize: 15, color: '#5f5e5e', lineHeight: 22, marginBottom: 8 },
    divider: { height: 1, backgroundColor: 'rgba(228,190,186,0.4)', marginVertical: 24 },
    label: {
        fontSize: 12, fontWeight: '600', letterSpacing: 1.5,
        color: '#5b403d', textTransform: 'uppercase', marginBottom: 8,
    },
    input: {
        backgroundColor: '#ffffff', color: '#1b1c1c', height: 56,
        borderRadius: 14, paddingHorizontal: 18, fontSize: 16,
        marginBottom: 20, borderWidth: 1.5, borderColor: 'rgba(228,190,186,0.4)',
    },
    primaryBtn: {
        width: '100%', backgroundColor: '#af101a', borderRadius: 14,
        paddingVertical: 20, alignItems: 'center', justifyContent: 'center',
        marginTop: 8, shadowColor: '#af101a',
        shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25,
        shadowRadius: 12, elevation: 8,
    },
    primaryBtnDisabled: { backgroundColor: '#c8b0af', shadowOpacity: 0, elevation: 0 },
    primaryBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700', letterSpacing: 4 },
    linkBtn: { marginTop: 20, alignItems: 'center', paddingVertical: 8 },
    linkBtnText: { fontSize: 14, color: '#5f5e5e' },
    linkBtnAccent: { color: '#af101a', fontWeight: '700' },
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 3, flexDirection: 'row', opacity: 0.3,
    },
    bottomBarSegment: { flex: 1 },
});
