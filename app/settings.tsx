import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Bell, LogOut, Shield, Trash2, User as UserIcon } from 'lucide-react-native';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
    const { user } = useAuth();
    const router = useRouter();

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            Alert.alert('Error', error.message);
        } else {
            router.replace('/(auth)/login');
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        // Deletion logic would typically involve an edge function securely deleting the user
                        Alert.alert('Not Implemented', 'Account deletion requires backend security functions in this MVP.');
                    }
                }
            ]
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(setup)/profile')}>
                    <View style={styles.menuIconContainer}>
                        <UserIcon color="#fff" size={20} />
                    </View>
                    <Text style={styles.menuText}>Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuIconContainer}>
                        <Bell color="#fff" size={20} />
                    </View>
                    <Text style={styles.menuText}>Push Notifications</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuIconContainer}>
                        <Shield color="#fff" size={20} />
                    </View>
                    <Text style={styles.menuText}>Privacy & Safety</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>System</Text>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Silo</Text>
                    <Text style={styles.infoValue}>Rutgers-New Brunswick</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Version</Text>
                    <Text style={styles.infoValue}>1.0.0 (MVP)</Text>
                </View>
            </View>

            <View style={styles.bottomActions}>
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <LogOut color="#CC0033" size={20} />
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
                    <Trash2 color="#FF3B30" size={20} />
                    <Text style={styles.deleteText}>Delete Account</Text>
                </TouchableOpacity>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fcf9f8',
    },
    content: {
        padding: 24,
        paddingTop: 40,
        paddingBottom: 60,
    },
    section: {
        marginBottom: 40,
    },
    sectionTitle: {
        color: '#5f5e5e',
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(228,190,186,0.3)',
    },
    menuIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(175,16,26,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuText: {
        color: '#1b1c1c',
        fontSize: 16,
        fontWeight: '500',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(228,190,186,0.3)',
    },
    infoLabel: {
        color: '#1b1c1c',
        fontSize: 16,
    },
    infoValue: {
        color: '#5f5e5e',
        fontSize: 16,
    },
    bottomActions: {
        marginTop: 20,
        gap: 16,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(175,16,26,0.08)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(175,16,26,0.2)',
        gap: 8,
    },
    signOutText: {
        color: '#af101a',
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 8,
    },
    deleteText: {
        color: '#af101a',
        fontSize: 16,
        fontWeight: '600',
    },
});
