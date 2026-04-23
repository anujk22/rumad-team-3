import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Tag = { id: string; name: string; emoji: string };

export default function InterestsScreen() {
    const { theme: C } = useTheme();
    const styles = createStyles(C);
    const { user } = useAuth();
    const router = useRouter();

    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [customTagText, setCustomTagText] = useState('');

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

    const addCustomTag = async () => {
        const name = customTagText.trim();
        if (!name) return;
        setCustomTagText('');
        try {
            // Capitalize first letter
            const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

            // Check if exists first
            let { data: existing } = await supabase.from('tags').select('*').ilike('name', name).maybeSingle();

            if (!existing) {
                const { data: newTag, error } = await supabase.from('tags').insert({ name: formattedName, emoji: '✨' }).select().single();
                if (!error && newTag) {
                    existing = newTag;
                }
            }

            if (existing) {
                // Determine if it is already in availableTags list
                const alreadyInList = availableTags.find(t => t.id === existing!.id);
                if (!alreadyInList) {
                    setAvailableTags(prev => [...prev, existing!]);
                }

                // Select it automatically
                if (!selectedTags.includes(existing.id)) {
                    setSelectedTags(prev => [...prev, existing!.id]);
                }
            }
        } catch (error) {
            console.error('Error adding custom tag:', error);
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
                <ActivityIndicator color={C.primary} size="large" />
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
                    <Text style={{ color: C.primary, fontWeight: '700' }}>{selectedTags.length}</Text> selected
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

                <View style={styles.customTagRow}>
                    <TextInput
                        style={styles.customTagInput}
                        placeholder="Add a custom interest..."
                        placeholderTextColor={C.outline}
                        value={customTagText}
                        onChangeText={setCustomTagText}
                        onSubmitEditing={addCustomTag}
                        blurOnSubmit={false}
                    />
                    <TouchableOpacity style={styles.customTagAddBtn} onPress={addCustomTag}>
                        <Text style={styles.customTagAddBtnText}>+</Text>
                    </TouchableOpacity>
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

const createStyles = (C: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.surface },
    scrollContent: { padding: 24, paddingTop: Platform.OS === 'ios' ? 70 : 56, paddingBottom: 40 },
    stepRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
    stepDot: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.outlineAlpha },
    stepDotActive: { backgroundColor: C.primary },
    eyebrow: { fontSize: 10, letterSpacing: 3, fontWeight: '700', color: C.tertiary, textTransform: 'uppercase', marginBottom: 8 },
    title: { fontSize: 40, fontWeight: '800', color: C.onSurface, marginBottom: 8, letterSpacing: -1 },
    subtitle: { fontSize: 16, color: C.secondary, marginBottom: 8 },
    divider: { height: 1, backgroundColor: C.outlineAlpha, marginVertical: 24 },
    tagCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    tag: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20,
        backgroundColor: C.card, borderWidth: 1.5, borderColor: C.outlineAlpha,
    },
    tagActive: { backgroundColor: C.primary, borderColor: C.primary },
    tagEmoji: { fontSize: 16 },
    tagText: { color: C.onSurface, fontSize: 14, fontWeight: '600' },
    tagTextActive: { color: C.card },
    customTagRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
    customTagInput: { flex: 1, height: 48, backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1.5, borderColor: C.outlineAlpha },
    customTagAddBtn: { width: 48, height: 48, backgroundColor: C.primaryAlpha, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    customTagAddBtnText: { fontSize: 24, color: C.primary, fontWeight: '400', marginTop: -2 },
    button: {
        backgroundColor: C.primary, height: 56, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    },
    buttonDisabled: { backgroundColor: '#c8b0af', shadowOpacity: 0, elevation: 0 },
    buttonText: { color: C.card, fontSize: 16, fontWeight: '700', letterSpacing: 2 },
});
