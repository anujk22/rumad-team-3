import { useTheme } from '@/hooks/useTheme';
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

export default function ForgotPasswordScreen() {
    const { theme: C } = useTheme();
    const styles = createStyles(C);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const router = useRouter();

    const handleResetRequest = async () => {
        if (!isRutgersEmail(email)) {
            Alert.alert('Rutgers Only', 'Please use your @rutgers.edu or @scarletmail.rutgers.edu email.');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
            redirectTo: Platform.select({
                web: window.location.origin + '/(auth)/reset-password',
                default: 'rumadt3://reset-password',
            }),
        });
        setLoading(false);

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            setSent(true);
        }
    };

    if (sent) {
        return (
            <View style={styles.root}>
                <StatusBar barStyle="light-content" backgroundColor={C.surface} />
                <View style={styles.contentCentered}>
                    <Text style={[styles.eyebrow, { textAlign: 'center' }]}>EMAIL SENT</Text>
                    <Text style={[styles.headline, { textAlign: 'center', fontSize: 32 }]}>Check your inbox</Text>
                    <Text style={[styles.subtext, { textAlign: 'center', marginTop: 12 }]}>
                        We've sent a password reset link to {'\n'}
                        <Text style={{ fontWeight: '700', color: C.onSurface }}>{email}</Text>
                    </Text>
                    <TouchableOpacity
                        style={[styles.primaryBtn, { marginTop: 40 }]}
                        onPress={() => router.replace('/(auth)/login')}
                    >
                        <Text style={styles.primaryBtnText}>BACK TO LOGIN</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.root}
        >
            <StatusBar barStyle="light-content" backgroundColor={C.surface} />

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
                    <Text style={styles.eyebrow}>RECOVER ACCESS</Text>
                    <Text style={styles.headline}>Forgot Password?</Text>
                    <Text style={styles.subtext}>Enter your email and we'll help you reset it.</Text>

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
                        onPress={handleResetRequest}
                        disabled={loading || !email}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color={C.onPrimary} />
                        ) : (
                            <Text style={styles.primaryBtnText}>SEND RESET LINK</Text>
                        )}
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

const createStyles = (C: any) => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.surface },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
    blob: { position: 'absolute', width: 280, height: 280, borderRadius: 140 },
    blobTopLeft: { top: -60, left: -60, backgroundColor: C.primaryAlpha },
    blobBottomRight: { bottom: -60, right: -60, backgroundColor: 'rgba(112,93,0,0.05)' },
    backBtn: {
        marginTop: Platform.OS === 'ios' ? 60 : 48,
        alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 2,
    },
    backBtnText: { fontSize: 15, color: C.primary, fontWeight: '600', letterSpacing: 0.3 },
    content: { flex: 1, marginTop: 32 },
    contentCentered: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
    eyebrow: {
        fontSize: 11, letterSpacing: 3.5, fontWeight: '700',
        color: C.tertiary, textTransform: 'uppercase', marginBottom: 10,
    },
    headline: { fontSize: 38, fontWeight: '800', color: C.onSurface, letterSpacing: -1, marginBottom: 8 },
    subtext: { fontSize: 15, color: C.secondary, lineHeight: 22, marginBottom: 8 },
    divider: { height: 1, backgroundColor: C.outlineAlpha, marginVertical: 24 },
    label: {
        fontSize: 12, fontWeight: '600', letterSpacing: 1.5,
        color: C.onSurfaceVariant, textTransform: 'uppercase', marginBottom: 8,
    },
    input: {
        backgroundColor: C.card, color: C.onSurface, height: 56,
        borderRadius: 14, paddingHorizontal: 18, fontSize: 16,
        marginBottom: 20, borderWidth: 1.5, borderColor: C.outlineAlpha,
    },
    primaryBtn: {
        width: '100%', backgroundColor: C.primary, borderRadius: 14,
        paddingVertical: 20, alignItems: 'center', justifyContent: 'center',
        marginTop: 8, shadowColor: C.primary,
        shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25,
        shadowRadius: 12, elevation: 8,
    },
    primaryBtnDisabled: { backgroundColor: '#c8b0af', shadowOpacity: 0, elevation: 0 },
    primaryBtnText: { color: C.card, fontSize: 13, fontWeight: '700', letterSpacing: 4 },
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 3, flexDirection: 'row', opacity: 0.3,
    },
    bottomBarSegment: { flex: 1 },
});
