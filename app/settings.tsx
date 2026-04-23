import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { F } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight, Crown, LogOut, Search, Shield, Trash2, User as UserIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
    const { theme: C, isDark, toggleTheme } = useTheme();
    const styles = createStyles(C);
    const { user, profile, isAdmin, refreshProfile, signOut, deleteAccount } = useAuth();
    const router = useRouter();
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [adminSearchEmail, setAdminSearchEmail] = useState('');
    const [foundUser, setFoundUser] = useState<{ id: string; email: string; first_name: string; role: string } | null>(null);
    const [searchLoading, setSearchLoading] = useState(false);

    const handleSignOut = async () => {
        await signOut();
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteAccount();
                            // Sign out and redirection is handled by deleteAccount and AuthProvider
                        } catch (err: any) {
                            Alert.alert('Error', err.message || 'Failed to delete account.');
                        }
                    }
                }
            ]
        );
    };

    // Admin functions
    const searchUser = async () => {
        if (!adminSearchEmail.trim()) return;
        setSearchLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, first_name, role')
                .eq('email', adminSearchEmail.trim().toLowerCase())
                .single();

            if (error || !data) {
                Alert.alert('Not Found', 'No user found with that email.');
                setFoundUser(null);
            } else {
                setFoundUser(data);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to search.');
        } finally {
            setSearchLoading(false);
        }
    };

    const toggleEventManager = async () => {
        if (!foundUser) return;
        const newRole = foundUser.role === 'event_manager' ? 'user' : 'event_manager';
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', foundUser.id);

        if (!error) {
            setFoundUser({ ...foundUser, role: newRole });
            Alert.alert('Success', `${foundUser.first_name} is now ${newRole === 'event_manager' ? 'an Event Manager' : 'a regular user'}.`);
        } else {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>

            {/* Profile Card */}
            {profile && (
                <View style={styles.profileCard}>
                    <View style={styles.profileAvatar}>
                        <UserIcon size={28} color={C.primary} />
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{profile.first_name || 'User'}</Text>
                        <Text style={styles.profileEmail}>{profile.email}</Text>
                        {profile.academic_year && <Text style={styles.profileDetail}>{profile.academic_year}{profile.major ? ` · ${profile.major}` : ''}</Text>}
                    </View>
                </View>
            )}

            {/* Account Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/edit-profile')}>
                    <View style={styles.menuIconContainer}>
                        <UserIcon color={C.primary} size={20} />
                    </View>
                    <Text style={styles.menuText}>Edit Profile</Text>
                    <ChevronRight size={18} color={C.secondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuIconContainer}>
                        <Bell color={C.primary} size={20} />
                    </View>
                    <Text style={styles.menuText}>Push Notifications</Text>
                    <ChevronRight size={18} color={C.secondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuIconContainer}>
                        <Shield color={C.primary} size={20} />
                    </View>
                    <Text style={styles.menuText}>Privacy & Safety</Text>
                    <ChevronRight size={18} color={C.secondary} />
                </TouchableOpacity>
            </View>

            {/* Admin Section */}
            {
                isAdmin && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Admin</Text>
                        <TouchableOpacity style={styles.menuItem} onPress={() => setShowAdminModal(true)}>
                            <View style={[styles.menuIconContainer, { backgroundColor: C.tertiaryAlpha }]}>
                                <Crown color={C.tertiary} size={20} />
                            </View>
                            <Text style={styles.menuText}>Manage Event Managers</Text>
                            <ChevronRight size={18} color={C.secondary} />
                        </TouchableOpacity>
                    </View>
                )
            }

            {/* System */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>System</Text>

                {/* Dark Mode Toggle */}
                <View style={styles.toggleRow}>
                    <View style={styles.toggleInfo}>
                        <Text style={styles.toggleLabel}>🌙 Dark Mode</Text>
                        <Text style={styles.toggleDesc}>Switch between light and dark theme</Text>
                    </View>
                    <Switch
                        value={isDark}
                        onValueChange={toggleTheme}
                        trackColor={{ false: '#ddd', true: 'rgba(212,200,168,0.4)' }}
                        thumbColor={isDark ? '#d4c8a8' : '#ccc'}
                    />
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Silo</Text>
                    <Text style={styles.infoValue}>Rutgers-New Brunswick</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Version</Text>
                    <Text style={styles.infoValue}>1.0.0 (MVP)</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Role</Text>
                    <Text style={[styles.infoValue, profile?.role !== 'user' && { color: C.tertiary, fontWeight: '700' }]}>
                        {profile?.role === 'admin' ? '👑 Admin' : profile?.role === 'event_manager' ? '🎫 Event Manager' : 'User'}
                    </Text>
                </View>
            </View>

            {/* Actions */}
            <View style={styles.bottomActions}>
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <LogOut color={C.primary} size={20} />
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
                    <Trash2 color="#FF3B30" size={20} />
                    <Text style={styles.deleteText}>Delete Account</Text>
                </TouchableOpacity>
            </View>

            {/* Admin Modal */}
            <Modal visible={showAdminModal} animationType="slide" presentationStyle="formSheet">
                <View style={styles.adminModal}>
                    <View style={styles.adminModalHeader}>
                        <Text style={styles.adminModalTitle}>Event Managers</Text>
                        <TouchableOpacity onPress={() => { setShowAdminModal(false); setFoundUser(null); setAdminSearchEmail(''); }}>
                            <Text style={{ fontSize: 16, color: C.primary, fontWeight: '600' }}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.adminModalDesc}>
                        Search for a user by email to grant or revoke Event Manager status.
                    </Text>

                    <View style={styles.adminSearchRow}>
                        <TextInput
                            style={styles.adminSearchInput}
                            placeholder="user@scarletmail.rutgers.edu"
                            placeholderTextColor={C.secondary}
                            value={adminSearchEmail}
                            onChangeText={setAdminSearchEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                        <TouchableOpacity style={styles.adminSearchBtn} onPress={searchUser} disabled={searchLoading}>
                            <Search size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {foundUser && (
                        <View style={styles.adminFoundCard}>
                            <View style={styles.adminFoundInfo}>
                                <Text style={styles.adminFoundName}>{foundUser.first_name || 'User'}</Text>
                                <Text style={styles.adminFoundEmail}>{foundUser.email}</Text>
                                <Text style={styles.adminFoundRole}>
                                    Current role: <Text style={{ fontWeight: '700' }}>{foundUser.role}</Text>
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.adminToggleBtn, foundUser.role === 'event_manager' && styles.adminToggleBtnActive]}
                                onPress={toggleEventManager}
                            >
                                <Text style={styles.adminToggleBtnText}>
                                    {foundUser.role === 'event_manager' ? 'Revoke' : 'Grant'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Modal>
        </ScrollView >
    );
}

const createStyles = (C: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.surface },
    content: { padding: 24, paddingTop: 20, paddingBottom: 60 },
    profileCard: {
        flexDirection: 'row', alignItems: 'center', gap: 16,
        backgroundColor: C.card, borderRadius: 20, padding: 20,
        marginBottom: 28, borderWidth: 1, borderColor: C.outlineAlpha,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    profileAvatar: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: C.primaryAlpha,
        alignItems: 'center', justifyContent: 'center',
    },
    profileInfo: { flex: 1 },
    profileName: { fontFamily: F.display, fontSize: 22, color: C.onSurface },
    profileEmail: { fontFamily: F.body, fontSize: 13, color: C.secondary, marginTop: 2 },
    profileDetail: { fontFamily: F.label, fontSize: 11, color: C.tertiary, marginTop: 4 },
    section: { marginBottom: 28 },
    sectionTitle: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 2, color: C.onSurfaceVariant, textTransform: 'uppercase', marginBottom: 16 },
    toggleRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: C.card, padding: 16, borderRadius: 12, marginBottom: 10,
        borderWidth: 1, borderColor: C.outlineAlpha,
    },
    toggleInfo: { flex: 1 },
    toggleLabel: { fontFamily: F.bodyBold, fontSize: 15, color: C.onSurface },
    toggleDesc: { fontFamily: F.body, fontSize: 12, color: C.secondary, marginTop: 2 },
    menuItem: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.card, padding: 16, borderRadius: 12, marginBottom: 10,
        borderWidth: 1, borderColor: C.outlineAlpha,
    },
    menuIconContainer: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: C.primaryAlpha,
        justifyContent: 'center', alignItems: 'center', marginRight: 14,
    },
    menuText: { fontFamily: F.bodyBold, color: C.onSurface, fontSize: 15, flex: 1 },
    infoRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.outlineAlpha,
    },
    infoLabel: { fontFamily: F.body, color: C.onSurface, fontSize: 15 },
    infoValue: { fontFamily: F.body, color: C.secondary, fontSize: 15 },
    bottomActions: { marginTop: 8, gap: 12 },
    signOutButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: C.primaryAlpha, padding: 16,
        borderRadius: 12, borderWidth: 1, borderColor: 'rgba(175,16,26,0.2)', gap: 8,
    },
    signOutText: { fontFamily: F.bodyBold, color: C.primary, fontSize: 15 },
    deleteButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        padding: 16, gap: 8,
    },
    deleteText: { fontFamily: F.bodyBold, color: '#FF3B30', fontSize: 15 },
    adminModal: { flex: 1, backgroundColor: C.surface, padding: 24, paddingTop: 20 },
    adminModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    adminModalTitle: { fontFamily: F.display, fontSize: 28, color: C.onSurface },
    adminModalDesc: { fontFamily: F.body, fontSize: 14, color: C.secondary, lineHeight: 20, marginBottom: 24 },
    adminSearchRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    adminSearchInput: {
        flex: 1, backgroundColor: C.card, height: 48, borderRadius: 12,
        paddingHorizontal: 16, fontFamily: F.body, fontSize: 14, color: C.onSurface,
        borderWidth: 1, borderColor: C.outlineAlpha,
    },
    adminSearchBtn: {
        width: 48, height: 48, borderRadius: 12, backgroundColor: C.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    adminFoundCard: {
        backgroundColor: C.card, borderRadius: 16, padding: 20,
        borderWidth: 1, borderColor: C.outlineAlpha,
        flexDirection: 'row', alignItems: 'center',
    },
    adminFoundInfo: { flex: 1 },
    adminFoundName: { fontFamily: F.bodyBold, fontSize: 16, color: C.onSurface },
    adminFoundEmail: { fontFamily: F.body, fontSize: 13, color: C.secondary, marginTop: 2 },
    adminFoundRole: { fontFamily: F.body, fontSize: 12, color: C.tertiary, marginTop: 4 },
    adminToggleBtn: {
        paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
        backgroundColor: C.tertiary,
    },
    adminToggleBtnActive: { backgroundColor: '#FF3B30' },
    adminToggleBtnText: { fontFamily: F.labelExtra, fontSize: 11, letterSpacing: 1, color: C.card },
});
