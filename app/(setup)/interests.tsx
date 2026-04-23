import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Tag = { id: string; name: string; emoji: string };

export default function InterestsScreen() {
    const { user } = useAuth();
    const router = useRouter();

    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchTags();
    }, []);

    const fetchTags = async () => {
        try {
            const { data, error } = await supabase.from('tags').select('*').order('name');
            if (error) throw error;
            setAvailableTags(data || []);
        } catch (error) {
            console.error('Error fetching tags:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleTag = (tagId: string) => {
        if (selectedTags.includes(tagId)) {
            setSelectedTags(prev => prev.filter(id => id !== tagId));
        } else {
            setSelectedTags(prev => [...prev, tagId]);
        }
    };

    const handleContinue = async () => {
        if (selectedTags.length < 3) {
            Alert.alert('Pick More', 'Please select at least 3 interests so we can find your people.');
            return;
        }

        setSaving(true);
        try {
            // Delete existing tags
            await supabase.from('user_tags').delete().eq('user_id', user?.id);

            // Insert new tags
            const userTagsToInsert = selectedTags.map(tagId => ({
                user_id: user?.id,
                tag_id: tagId,
            }));

            const { error } = await supabase.from('user_tags').insert(userTagsToInsert);
            if (error) throw error;

            router.push('/(setup)/photos');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color="#af101a" size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.stepRow}>
                    {[1, 2, 3, 4, 5].map(s => (
                        <View key={s} style={[styles.stepDot, s <= 3 && styles.stepDotActive]} />
                    ))}
                </View>

                <Text style={styles.eyebrow}>STEP 3 OF 5</Text>
                <Text style={styles.title}>Your Interests.</Text>
                <Text style={styles.subtitle}>
                    Pick at least 3 that describe you.{' '}
                    <Text style={{ color: '#af101a', fontWeight: '700' }}>{selectedTags.length}</Text> selected
                </Text>

                <View style={styles.divider} />

                <View style={styles.tagCloud}>
                    {availableTags.map(tag => {
                        const isActive = selectedTags.includes(tag.id);
                        return (
                            <TouchableOpacity
                                key={tag.id}
                                style={[styles.tag, isActive && styles.tagActive]}
                                onPress={() => toggleTag(tag.id)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.tagEmoji}>{tag.emoji}</Text>
                                <Text style={[styles.tagText, isActive && styles.tagTextActive]}>{tag.name}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <TouchableOpacity
                    style={[styles.button, selectedTags.length < 3 && styles.buttonDisabled]}
                    onPress={handleContinue}
                    disabled={saving || selectedTags.length < 3}
                >
                    <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Continue'}</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcf9f8' },
    scrollContent: { padding: 24, paddingTop: Platform.OS === 'ios' ? 70 : 56, paddingBottom: 40 },
    stepRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
    stepDot: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(228,190,186,0.5)' },
    stepDotActive: { backgroundColor: '#af101a' },
    eyebrow: { fontSize: 10, letterSpacing: 3, fontWeight: '700', color: '#705d00', textTransform: 'uppercase', marginBottom: 8 },
    title: { fontSize: 40, fontWeight: '800', color: '#1b1c1c', marginBottom: 8, letterSpacing: -1 },
    subtitle: { fontSize: 16, color: '#5f5e5e', marginBottom: 8 },
    divider: { height: 1, backgroundColor: 'rgba(228,190,186,0.4)', marginVertical: 24 },
    tagCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
    tag: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20,
        backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: 'rgba(228,190,186,0.4)',
    },
    tagActive: { backgroundColor: '#af101a', borderColor: '#af101a' },
    tagEmoji: { fontSize: 16 },
    tagText: { color: '#1b1c1c', fontSize: 14, fontWeight: '600' },
    tagTextActive: { color: '#ffffff' },
    button: {
        backgroundColor: '#af101a', height: 56, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#af101a', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    },
    buttonDisabled: { backgroundColor: '#c8b0af', shadowOpacity: 0, elevation: 0 },
    buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
});
