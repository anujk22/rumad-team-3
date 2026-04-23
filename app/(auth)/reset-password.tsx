import { useTheme } from '@/hooks/useTheme';
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

export default function ResetPasswordScreen() {
    const { theme: C } = useTheme();
    const styles = createStyles(C);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleResetPassword = async () => {
        if (password.length < 6) {
            Alert.alert('Invalid Password', 'Password must be at least 6 characters.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Mismatch', 'Passwords do not match.');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            // Sign out the recovery session so the auth listener
            // doesn't auto-redirect before the user logs in fresh.
            await supabase.auth.signOut();
            Alert.alert('Success', 'Your password has been updated. Please log in.', [
                { text: 'OK', onPress: () => router.replace('/(auth)/login') }
            ]);
        }
    };

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
                <View style={styles.content}>
                    <Text style={styles.eyebrow}>SECURITY UPDATE</Text>
                    <Text style={styles.headline}>New Password</Text>
                    <Text style={styles.subtext}>Set a strong password to secure your account.</Text>

                    <View style={styles.divider} />

                    <Text style={styles.label}>New Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter new password"
                        placeholderTextColor={C.outline}
                        secureTextEntry
                        autoCapitalize="none"
                        value={password}
                        onChangeText={setPassword}
                    />

                    <Text style={styles.label}>Confirm New Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Verify new password"
                        placeholderTextColor={C.outline}
                        secureTextEntry
                        autoCapitalize="none"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />

                    <TouchableOpacity
                        style={[
                            styles.primaryBtn,
                            (!password || !confirmPassword) && styles.primaryBtnDisabled,
                        ]}
                        onPress={handleResetPassword}
                        disabled={loading || !password || !confirmPassword}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color={C.onPrimary} />
                        ) : (
                            <Text style={styles.primaryBtnText}>UPDATE PASSWORD</Text>
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
    content: { flex: 1, marginTop: 80 },
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
