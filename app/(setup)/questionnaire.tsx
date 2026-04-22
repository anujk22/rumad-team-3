import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Grad', 'Transfer'];

type Tag = {
    id: string;
    name: string;
};

export default function QuestionnaireScreen() {
    const { user } = useAuth();
    const router = useRouter();

    const [year, setYear] = useState('');
    const [major, setMajor] = useState('Undecided'); // Simplification for mvp, could be a searchable dropdown
    const [isCommuter, setIsCommuter] = useState(false);
    const [isInternational, setIsInternational] = useState(false);

    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchTags();
    }, []);

    const fetchTags = async () => {
        try {
            const { data, error } = await supabase.from('tags').select('*');
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

    const handleFinish = async () => {
        if (!year) {
            Alert.alert('Required', 'Please select your academic year.');
            return;
        }
        if (selectedTags.length < 3) {
            Alert.alert('Required', 'Please select at least 3 tags.');
            return;
        }

        setSaving(true);
        try {
            // 1. Update Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    academic_year: year,
                    major: major,
                    is_commuter: isCommuter,
                    is_international: isInternational,
                })
                .eq('id', user?.id);

            if (profileError) throw profileError;

            // 2. Insert User Tags
            const userTagsToInsert = selectedTags.map(tagId => ({
                user_id: user?.id,
                tag_id: tagId,
            }));

            // Delete existing tags first just in case
            await supabase.from('user_tags').delete().eq('user_id', user?.id);

            const { error: tagsError } = await supabase
                .from('user_tags')
                .insert(userTagsToInsert);

            if (tagsError) throw tagsError;

            // Navigate to main app
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loader]}>
                <ActivityIndicator color="#CC0033" size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>The details.</Text>
                <Text style={styles.subtitle}>Help us find your people.</Text>

                <View style={styles.section}>
                    <Text style={styles.label}>Academic Year</Text>
                    <View style={styles.pillContainer}>
                        {YEARS.map(y => (
                            <TouchableOpacity
                                key={y}
                                style={[styles.pill, year === y && styles.pillActive]}
                                onPress={() => setYear(y)}
                            >
                                <Text style={[styles.pillText, year === y && styles.pillTextActive]}>{y}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Living Situation</Text>
                    <View style={styles.row}>
                        <Text style={styles.rowText}>I commute to campus</Text>
                        <TouchableOpacity
                            style={[styles.toggle, isCommuter && styles.toggleActive]}
                            onPress={() => setIsCommuter(!isCommuter)}
                        />
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.rowText}>International Student</Text>
                        <TouchableOpacity
                            style={[styles.toggle, isInternational && styles.toggleActive]}
                            onPress={() => setIsInternational(!isInternational)}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Interests & Hobbies (Select min 3)</Text>
                    <View style={styles.tagCloud}>
                        {availableTags.map(tag => {
                            const isActive = selectedTags.includes(tag.id);
                            return (
                                <TouchableOpacity
                                    key={tag.id}
                                    style={[styles.tag, isActive && styles.tagActive]}
                                    onPress={() => toggleTag(tag.id)}
                                >
                                    <Text style={[styles.tagText, isActive && styles.tagTextActive]}>{tag.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <TouchableOpacity style={styles.button} onPress={handleFinish} disabled={saving}>
                    <Text style={styles.buttonText}>{saving ? 'Finishing...' : 'Complete Profile'}</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fcf9f8',
    },
    loader: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 24,
        paddingTop: 80,
        paddingBottom: 60,
    },
    title: {
        fontSize: 40,
        fontWeight: '800',
        color: '#1b1c1c',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#5f5e5e',
        marginBottom: 40,
    },
    section: {
        marginBottom: 40,
    },
    label: {
        color: '#5f5e5e',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    pillContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    pill: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(228,190,186,0.5)',
        backgroundColor: '#ffffff',
    },
    pillActive: {
        backgroundColor: '#af101a',
        borderColor: '#af101a',
    },
    pillText: {
        color: '#5f5e5e',
        fontSize: 14,
        fontWeight: '600',
    },
    pillTextActive: {
        color: '#ffffff',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(228,190,186,0.3)',
    },
    rowText: {
        color: '#1b1c1c',
        fontSize: 16,
    },
    toggle: {
        width: 50,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(228,190,186,0.5)',
    },
    toggleActive: {
        backgroundColor: '#af101a',
    },
    tagCloud: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    tag: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: 'rgba(228,190,186,0.3)',
    },
    tagActive: {
        backgroundColor: '#af101a',
        borderColor: '#af101a',
    },
    tagText: {
        color: '#1b1c1c',
        fontSize: 14,
    },
    tagTextActive: {
        fontWeight: '700',
        color: '#ffffff',
    },
    button: {
        backgroundColor: '#af101a',
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#af101a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    },
});
