import ProfilePreviewCard from '@/components/ProfilePreviewCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Grad', 'Transfer'];
const ETHNICITIES = ['Asian', 'Caucasian', 'Hispanic/Latino', 'Middle Eastern', 'African American / Black', 'Mixed', 'Other', 'Prefer not to say'];
const RELIGIONS = ['Agnostic', 'Atheist', 'Buddhist', 'Catholic', 'Christian', 'Hindu', 'Jewish', 'Muslim', 'Spiritual', 'Unsure', 'Other', 'Prefer not to say'];

const HEIGHT_OPTIONS = (() => {
    const opts: { label: string; value: number }[] = [];
    for (let ft = 4; ft <= 7; ft++) {
        for (let inch = 0; inch < 12; inch++) {
            if (ft === 7 && inch > 0) break;
            opts.push({ label: `${ft}'${inch}"`, value: ft * 12 + inch });
        }
    }
    return opts;
})();

export default function EditProfileScreen() {
    const { user, profile, refreshProfile } = useAuth();
    const router = useRouter();

    const [firstName, setFirstName] = useState(profile?.first_name || '');
    const [year, setYear] = useState(profile?.academic_year || '');
    const [major, setMajor] = useState(profile?.major || '');
    const [heightInches, setHeightInches] = useState<number | null>(profile?.height_inches || null);
    const [showHeightPicker, setShowHeightPicker] = useState(false);
    const [ethnicity, setEthnicity] = useState(profile?.ethnicity || '');
    const [religion, setReligion] = useState(profile?.religion || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [availableTags, setAvailableTags] = useState<any[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [customTagText, setCustomTagText] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (profile) {
            setFirstName(profile.first_name || '');
            setYear(profile.academic_year || '');
            setMajor(profile.major || '');
            setHeightInches(profile.height_inches || null);
            setEthnicity(profile.ethnicity || '');
            setReligion(profile.religion || '');
            setBio(profile.bio || '');
        }
        if (user) {
            fetchUserTags();
        }
        fetchTags();
    }, [profile, user]);

    const fetchUserTags = async () => {
        const { data } = await supabase.from('user_tags').select('tag_id').eq('user_id', user?.id);
        if (data) setSelectedTags(data.map(t => t.tag_id));
    };

    const fetchTags = async () => {
        const { data } = await supabase.from('tags').select('*').order('name');
        if (data) setAvailableTags(data);
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
            const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
            let { data: existing } = await supabase.from('tags').select('*').ilike('name', name).maybeSingle();

            if (!existing) {
                const { data: newTag, error } = await supabase.from('tags').insert({ name: formattedName, emoji: '✨' }).select().single();
                if (!error && newTag) existing = newTag;
            }

            if (existing) {
                if (!availableTags.find(t => t.id === existing!.id)) {
                    setAvailableTags(prev => [...prev, existing!]);
                }
                if (!selectedTags.includes(existing.id)) {
                    setSelectedTags(prev => [...prev, existing!.id]);
                }
            }
        } catch (error) {
            console.error('Error adding custom tag:', error);
        }
    };

    const handleSave = async () => {
        if (!firstName.trim()) {
            Alert.alert('Required', 'First name is required.');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    first_name: firstName.trim(),
                    academic_year: year || null,
                    major: major.trim() || null,
                    height_inches: heightInches,
                    ethnicity: ethnicity || null,
                    religion: religion || null,
                    bio: bio.trim() || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user?.id);

            if (error) throw error;

            // Save interests
            await supabase.from('user_tags').delete().eq('user_id', user?.id);
            if (selectedTags.length > 0) {
                const tagsToInsert = selectedTags.map(tagId => ({ user_id: user?.id, tag_id: tagId }));
                await supabase.from('user_tags').insert(tagsToInsert);
            }

            await refreshProfile();
            router.back();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    const selectedTagObjects = availableTags.filter(t => selectedTags.includes(t.id));

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#1b1c1c" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                    <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
                        {saving ? <ActivityIndicator size="small" color="#af101a" /> : <Text style={styles.saveText}>Save</Text>}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <ProfilePreviewCard
                        firstName={firstName}
                        age={profile?.age}
                        year={year}
                        major={major}
                        heightInches={heightInches}
                        ethnicity={ethnicity}
                        religion={religion}
                        bio={bio}
                        avatarUrls={profile?.avatar_urls || []}
                        selectedTags={selectedTagObjects}
                    />

                    <View style={styles.divider} />
                    <Text style={styles.label}>First Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Your Name"
                        placeholderTextColor="#8f6f6c"
                        value={firstName}
                        onChangeText={setFirstName}
                    />

                    <Text style={styles.label}>Bio</Text>
                    <TextInput
                        style={[styles.input, { height: 100, paddingTop: 16, textAlignVertical: 'top' }]}
                        placeholder="Tell people about yourself..."
                        placeholderTextColor="#8f6f6c"
                        multiline
                        maxLength={300}
                        value={bio}
                        onChangeText={setBio}
                    />

                    <View style={styles.divider} />

                    <Text style={styles.label}>Academic Year</Text>
                    <View style={styles.pillContainer}>
                        {YEARS.map(y => (
                            <TouchableOpacity
                                key={y}
                                style={[styles.pill, year === y && styles.pillActive]}
                                onPress={() => setYear(year === y ? '' : y)}
                            >
                                <Text style={[styles.pillText, year === y && styles.pillTextActive]}>{y}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Major</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Computer Science"
                        placeholderTextColor="#8f6f6c"
                        value={major}
                        onChangeText={setMajor}
                    />

                    <View style={styles.divider} />

                    <Text style={styles.label}>Height</Text>
                    <TouchableOpacity
                        style={styles.pickerBtn}
                        onPress={() => setShowHeightPicker(!showHeightPicker)}
                    >
                        <Text style={[styles.pickerBtnText, !heightInches && { color: '#8f6f6c' }]}>
                            {heightInches ? `${Math.floor(heightInches / 12)}'${heightInches % 12}"` : 'Select height'}
                        </Text>
                    </TouchableOpacity>

                    {showHeightPicker && (
                        <View style={styles.dropdownContainer}>
                            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true} style={styles.verticalHeightScroll}>
                                {HEIGHT_OPTIONS.map(h => (
                                    <TouchableOpacity
                                        key={h.value}
                                        style={[styles.dropdownItem, heightInches === h.value && styles.dropdownItemActive]}
                                        onPress={() => { setHeightInches(h.value); setShowHeightPicker(false); }}
                                    >
                                        <Text style={[styles.dropdownItemText, heightInches === h.value && styles.dropdownItemTextActive]}>{h.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <Text style={styles.label}>Ethnicity</Text>
                    <View style={styles.pillContainer}>
                        {ETHNICITIES.map(e => (
                            <TouchableOpacity
                                key={e}
                                style={[styles.pill, ethnicity === e && styles.pillActive]}
                                onPress={() => setEthnicity(ethnicity === e ? '' : e)}
                            >
                                <Text style={[styles.pillText, ethnicity === e && styles.pillTextActive]}>{e}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Religion</Text>
                    <View style={styles.pillContainer}>
                        {RELIGIONS.map(r => (
                            <TouchableOpacity
                                key={r}
                                style={[styles.pill, religion === r && styles.pillActive]}
                                onPress={() => setReligion(religion === r ? '' : r)}
                            >
                                <Text style={[styles.pillText, religion === r && styles.pillTextActive]}>{r}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.label}>Interests</Text>
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
                            placeholderTextColor="#8f6f6c"
                            value={customTagText}
                            onChangeText={setCustomTagText}
                            onSubmitEditing={addCustomTag}
                            blurOnSubmit={false}
                        />
                        <TouchableOpacity style={styles.customTagAddBtn} onPress={addCustomTag}>
                            <Text style={styles.customTagAddBtnText}>+</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcf9f8' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 12 : 12, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: 'rgba(228,190,186,0.3)', backgroundColor: '#fff'
    },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontFamily: 'Newsreader_800ExtraBold', fontSize: 20, color: '#1b1c1c', textAlign: 'center', flex: 1 },
    saveButton: { width: 60, alignItems: 'flex-end', justifyContent: 'center' },
    saveText: { fontSize: 16, color: '#af101a', fontWeight: '700' },
    scrollContent: { padding: 24, paddingBottom: 60 },
    divider: { height: 1, backgroundColor: 'rgba(228,190,186,0.4)', marginVertical: 24 },
    label: { color: '#5b403d', fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.5 },
    input: { backgroundColor: '#ffffff', color: '#1b1c1c', height: 56, borderRadius: 14, paddingHorizontal: 18, fontSize: 16, marginBottom: 24, borderWidth: 1.5, borderColor: 'rgba(228,190,186,0.4)' },
    pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    pill: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(228,190,186,0.5)', backgroundColor: '#ffffff' },
    pillActive: { backgroundColor: '#af101a', borderColor: '#af101a' },
    pillText: { color: '#5f5e5e', fontSize: 14, fontWeight: '600' },
    pillTextActive: { color: '#ffffff' },
    pickerBtn: { backgroundColor: '#ffffff', height: 56, borderRadius: 14, paddingHorizontal: 18, justifyContent: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: 'rgba(228,190,186,0.4)' },
    pickerBtnText: { fontSize: 16, color: '#1b1c1c' },
    dropdownContainer: { backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(228,190,186,0.4)', marginTop: -8, marginBottom: 24, overflow: 'hidden' },
    verticalHeightScroll: { maxHeight: 200 },
    dropdownItem: { paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(228,190,186,0.2)' },
    dropdownItemActive: { backgroundColor: 'rgba(175,16,26,0.08)' },
    dropdownItemText: { fontSize: 16, color: '#1b1c1c' },
    dropdownItemTextActive: { color: '#af101a', fontWeight: '700' },
    tagCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    tag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: 'rgba(228,190,186,0.4)' },
    tagActive: { backgroundColor: '#af101a', borderColor: '#af101a' },
    tagEmoji: { fontSize: 16 },
    tagText: { color: '#1b1c1c', fontSize: 14, fontWeight: '600' },
    tagTextActive: { color: '#ffffff' },
    customTagRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    customTagInput: { flex: 1, height: 48, backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 16, borderWidth: 1.5, borderColor: 'rgba(228,190,186,0.4)' },
    customTagAddBtn: { width: 48, height: 48, backgroundColor: 'rgba(175,16,26,0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    customTagAddBtnText: { fontSize: 24, color: '#af101a', fontWeight: '400', marginTop: -2 }
});
