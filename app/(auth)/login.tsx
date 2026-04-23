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

export default function LoginScreen() {
    const { theme: C } = useTheme();
    const styles = createStyles(C);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSignIn = async () => {
        if (!isRutgersEmail(email)) {
            Alert.alert('Rutgers Only', 'Please use your @rutgers.edu or @scarletmail.rutgers.edu email.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Invalid Password', 'Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
        });
        setLoading(false);

        if (error) {
            Alert.alert('Login Failed', error.message);
        }
        // Auth state change listener will handle routing
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
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>

                <View style={styles.content}>
                    <Text style={styles.eyebrow}>WELCOME BACK</Text>
                    <Text style={styles.headline}>Log In</Text>
                    <Text style={styles.subtext}>Resume your seat at the table.</Text>

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

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Your password"
                        placeholderTextColor={C.outline}
                        secureTextEntry
                        autoCapitalize="none"
                        value={password}
                        onChangeText={setPassword}
                    />

                    <TouchableOpacity
                        style={[
                            styles.primaryBtn,
                            (!email || !password) && styles.primaryBtnDisabled,
                        ]}
                        onPress={handleSignIn}
                        disabled={loading || !email || !password}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color={C.onPrimary} />
                        ) : (
                            <Text style={styles.primaryBtnText}>LOG IN</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkBtn}
                        onPress={() => router.push('/(auth)/signup')}
                    >
                        <Text style={styles.linkBtnText}>
                            New here?{' '}
                            <Text style={styles.linkBtnAccent}>Create an account</Text>
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
    linkBtn: { marginTop: 20, alignItems: 'center', paddingVertical: 8 },
    linkBtnText: { fontSize: 14, color: C.secondary },
    linkBtnAccent: { color: C.primary, fontWeight: '700' },
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 3, flexDirection: 'row', opacity: 0.3,
    },
    bottomBarSegment: { flex: 1 },
});
