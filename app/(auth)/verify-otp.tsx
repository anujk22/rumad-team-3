import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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



const OTP_LENGTH = 8;

export default function VerifyOtpScreen() {
    const { theme: C } = useTheme();
    const styles = createStyles(C);
    const { email, isNewUser } = useLocalSearchParams<{ email: string; isNewUser: string }>();
    const router = useRouter();
    const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const inputRefs = useRef<(TextInput | null)[]>([]);

    // Cooldown timer for resend
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const handleDigitChange = (text: string, index: number) => {
        // Only allow numbers
        const cleaned = text.replace(/[^0-9]/g, '');
        if (cleaned.length > 1) {
            // Handle paste — distribute digits across boxes
            const pasted = cleaned.slice(0, OTP_LENGTH).split('');
            const newDigits = [...digits];
            pasted.forEach((d, i) => {
                if (index + i < OTP_LENGTH) newDigits[index + i] = d;
            });
            setDigits(newDigits);
            const nextIdx = Math.min(index + pasted.length, OTP_LENGTH - 1);
            inputRefs.current[nextIdx]?.focus();
            return;
        }

        const newDigits = [...digits];
        newDigits[index] = cleaned;
        setDigits(newDigits);

        // Auto-advance to next input
        if (cleaned && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
            const newDigits = [...digits];
            newDigits[index - 1] = '';
            setDigits(newDigits);
        }
    };

    const handleVerify = async () => {
        const token = digits.join('');
        if (token.length !== OTP_LENGTH) {
            Alert.alert('Incomplete Code', 'Please enter the full 6-digit verification code.');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email: email!,
                token,
                type: isNewUser === 'true' ? 'signup' : 'email',
            });

            if (error) {
                Alert.alert('Verification Failed', error.message);
            } else if (data.session) {
                if (isNewUser === 'true') {
                    router.replace({
                        pathname: '/(auth)/create-password',
                        params: { email: email! },
                    });
                }
                // If not a new user, auth state change will handle routing
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: email!,
                options: { shouldCreateUser: false },
            });
            if (error) {
                Alert.alert('Error', error.message);
            } else {
                Alert.alert('Code Resent', 'A new verification code has been sent to your email.');
                setResendCooldown(60);
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to resend code.');
        }
    };

    const otp = digits.join('');

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
                    <Text style={styles.eyebrow}>VERIFY YOUR EMAIL</Text>
                    <Text style={styles.headline}>Enter Code</Text>
                    <Text style={styles.subtext}>
                        We've sent an 8-digit code to{'\n'}
                        <Text style={styles.emailHighlight}>{email}</Text>
                    </Text>

                    <View style={styles.divider} />

                    {/* OTP Input Boxes */}
                    <View style={styles.otpContainer}>
                        {digits.map((digit, i) => (
                            <TextInput
                                key={i}
                                ref={(ref) => { inputRefs.current[i] = ref; }}
                                style={[
                                    styles.otpBox,
                                    digit ? styles.otpBoxFilled : {},
                                ]}
                                value={digit}
                                onChangeText={(text) => handleDigitChange(text, i)}
                                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                                keyboardType="number-pad"
                                selectTextOnFocus
                                autoFocus={i === 0}
                            />
                        ))}
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.primaryBtn,
                            otp.length !== OTP_LENGTH && styles.primaryBtnDisabled,
                        ]}
                        onPress={handleVerify}
                        disabled={loading || otp.length !== OTP_LENGTH}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color={C.onPrimary} />
                        ) : (
                            <Text style={styles.primaryBtnText}>VERIFY</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.resendBtn}
                        onPress={handleResend}
                        disabled={resendCooldown > 0}
                    >
                        <Text style={[styles.resendText, resendCooldown > 0 && { opacity: 0.5 }]}>
                            {resendCooldown > 0
                                ? `Resend code in ${resendCooldown}s`
                                : "Didn't get the code? Resend"}
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
    eyebrow: {
        fontSize: 11, letterSpacing: 3.5, fontWeight: '700',
        color: C.tertiary, textTransform: 'uppercase', marginBottom: 10,
    },
    headline: { fontSize: 38, fontWeight: '800', color: C.onSurface, letterSpacing: -1, marginBottom: 8 },
    subtext: { fontSize: 15, color: C.secondary, lineHeight: 24, marginBottom: 8 },
    emailHighlight: { color: C.primary, fontWeight: '700' },
    divider: { height: 1, backgroundColor: C.outlineAlpha, marginVertical: 24 },
    otpContainer: {
        flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 32,
    },
    otpBox: {
        width: 36, height: 52, borderRadius: 10, borderWidth: 2,
        borderColor: C.outlineAlpha, backgroundColor: C.card,
        textAlign: 'center', fontSize: 20, fontWeight: '800', color: C.onSurface,
    },
    otpBoxFilled: { borderColor: C.primary, backgroundColor: 'rgba(175,16,26,0.04)' },
    primaryBtn: {
        width: '100%', backgroundColor: C.primary, borderRadius: 14,
        paddingVertical: 20, alignItems: 'center', justifyContent: 'center',
        shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
    },
    primaryBtnDisabled: { backgroundColor: '#c8b0af', shadowOpacity: 0, elevation: 0 },
    primaryBtnText: { color: C.card, fontSize: 13, fontWeight: '700', letterSpacing: 4 },
    resendBtn: { marginTop: 24, alignItems: 'center', paddingVertical: 8 },
    resendText: { fontSize: 14, color: C.primary, fontWeight: '600' },
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 3, flexDirection: 'row', opacity: 0.3,
    },
    bottomBarSegment: { flex: 1 },
});
