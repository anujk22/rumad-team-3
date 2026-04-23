import ProfilePreviewCard from '@/components/ProfilePreviewCard';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { F } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
    const { theme } = useTheme();
    const router = useRouter();
    const styles = createStyles(theme);

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

    const [photos, setPhotos] = useState<(string | null)[]>(Array(6).fill(null));

    const [friendsEnabled, setFriendsEnabled] = useState(profile?.friends_enabled ?? true);
    const [datingEnabled, setDatingEnabled] = useState(profile?.dating_enabled ?? false);

    useEffect(() => {
        if (profile) {
            setFirstName(profile.first_name || '');
            setYear(profile.academic_year || '');
            setMajor(profile.major || '');
            setHeightInches(profile.height_inches || null);
            setEthnicity(profile.ethnicity || '');
            setReligion(profile.religion || '');
            setBio(profile.bio || '');
            setFriendsEnabled(profile.friends_enabled ?? true);
            setDatingEnabled(profile.dating_enabled ?? false);

            const initialPhotos = Array(6).fill(null);
            if (profile.avatar_urls) {
                profile.avatar_urls.forEach((url, i) => {
                    if (i < 6) initialPhotos[i] = url;
                });
            }
            setPhotos(initialPhotos);
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

    const pickImage = async (index: number) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            const newPhotos = [...photos];
            newPhotos[index] = `data:image/jpeg;base64,${result.assets[0].base64}`;
            setPhotos(newPhotos);
        }
    };

    const removePhoto = (index: number) => {
        const newPhotos = [...photos];
        newPhotos[index] = null;
        setPhotos(newPhotos);
    };

    const handleSave = async () => {
        if (!firstName.trim()) {
            Alert.alert('Required', 'First name is required.');
            return;
        }

        setSaving(true);
        try {
            let uploadedUrls: string[] | undefined = undefined;
            if (user?.id) {
                uploadedUrls = [];
                for (let i = 0; i < photos.length; i++) {
                    const p = photos[i];
                    if (p) {
                        if (p.startsWith('data:image')) {
                            const base64Data = p.replace(/^data:image\/\w+;base64,/, '');
                            const imagePath = `${user.id}/${Date.now()}_${i}.jpg`;
                            const { error: uploadError } = await supabase.storage
                                .from('avatars')
                                .upload(imagePath, new Uint8Array(decode(base64Data)), {
                                    contentType: 'image/jpeg',
                                    upsert: true
                                });

                            if (uploadError) {
                                console.error('Upload Error:', uploadError);
                                throw uploadError;
                            }

                            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(imagePath);
                            uploadedUrls.push(publicUrl);
                        } else {
                            uploadedUrls.push(p);
                        }
                    }
                }
            }

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
                    friends_enabled: friendsEnabled,
                    dating_enabled: datingEnabled,
                    ...(uploadedUrls ? { avatar_urls: uploadedUrls } : {}),
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
                        <ArrowLeft size={24} color={theme.onSurface} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                    <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
                        {saving ? <ActivityIndicator size="small" color={theme.primary} /> : <Text style={styles.saveText}>Save</Text>}
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
                        overrideImages={photos.filter((p): p is string => p !== null)}
                    />

                    <Text style={styles.label}>Current Photos</Text>
                    <View style={styles.photoSection}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoGrid}>
                            {photos.map((photo, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.photoBox, index === 0 && styles.primaryPhoto]}
                                    onPress={() => photo ? removePhoto(index) : pickImage(index)}
                                    activeOpacity={0.8}
                                >
                                    {photo ? (
                                        <>
                                            <Image source={{ uri: photo }} style={styles.image} />
                                            <View style={styles.removeBtn}>
                                                <Text style={styles.removeBtnText}>×</Text>
                                            </View>
                                        </>
                                    ) : (
                                        <View style={styles.addPhotoInner}>
                                            <Text style={styles.addPhotoPlus}>+</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.divider} />
                    <Text style={styles.label}>First Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Your Name"
                        placeholderTextColor={theme.outline}
                        value={firstName}
                        onChangeText={setFirstName}
                    />

                    <Text style={styles.label}>Bio</Text>
                    <TextInput
                        style={[styles.input, { height: 100, paddingTop: 16, textAlignVertical: 'top' }]}
                        placeholder="Tell people about yourself..."
                        placeholderTextColor={theme.outline}
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

                    <View style={styles.divider} />

                    <Text style={styles.label}>Profile Visibility</Text>
                    <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                            <Text style={styles.toggleLabel}>👋 Friends Mode</Text>
                            <Text style={styles.toggleDesc}>Appear in friends swiping pool</Text>
                        </View>
                        <Switch
                            value={friendsEnabled}
                            onValueChange={setFriendsEnabled}
                            trackColor={{ false: theme.outlineAlpha, true: 'rgba(59,130,246,0.4)' }}
                            thumbColor={friendsEnabled ? '#3b82f6' : theme.secondary}
                        />
                    </View>

                    <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                            <Text style={styles.toggleLabel}>💝 Dating Mode</Text>
                            <Text style={styles.toggleDesc}>Appear in dating swiping pool</Text>
                        </View>
                        <Switch
                            value={datingEnabled}
                            onValueChange={setDatingEnabled}
                            trackColor={{ false: theme.outlineAlpha, true: theme.primaryAlpha }}
                            thumbColor={datingEnabled ? theme.primary : theme.secondary}
                        />
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const createStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 12 : 12, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: theme.outlineAlpha, backgroundColor: theme.card
    },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontFamily: F.headlineBase, fontSize: 20, color: theme.onSurface, textAlign: 'center', flex: 1 },
    saveButton: { width: 60, alignItems: 'flex-end', justifyContent: 'center' },
    saveText: { fontFamily: F.label, fontSize: 16, color: theme.primary },
    scrollContent: { padding: 24, paddingBottom: 60 },
    divider: { height: 1, backgroundColor: theme.outlineAlpha, marginVertical: 24 },
    label: { fontFamily: F.label, color: theme.onSurfaceVariant, fontSize: 11, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.5 },
    input: { backgroundColor: theme.surfaceContainerLowest, color: theme.onSurface, fontFamily: F.body, height: 56, borderRadius: 14, paddingHorizontal: 18, fontSize: 16, marginBottom: 24, borderWidth: 1.5, borderColor: theme.outlineAlpha },
    pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    pill: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderColor: theme.outlineAlpha, backgroundColor: theme.surfaceContainerLowest },
    pillActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    pillText: { fontFamily: F.label, color: theme.secondary, fontSize: 13 },
    pillTextActive: { color: theme.onPrimary },
    pickerBtn: { backgroundColor: theme.surfaceContainerLowest, height: 56, borderRadius: 14, paddingHorizontal: 18, justifyContent: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: theme.outlineAlpha },
    pickerBtnText: { fontFamily: F.body, fontSize: 16, color: theme.onSurface },
    dropdownContainer: { backgroundColor: theme.surfaceContainerLowest, borderRadius: 14, borderWidth: 1.5, borderColor: theme.outlineAlpha, marginTop: -8, marginBottom: 24, overflow: 'hidden' },
    verticalHeightScroll: { maxHeight: 200 },
    dropdownItem: { paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: theme.outlineAlpha },
    dropdownItemActive: { backgroundColor: theme.primaryAlpha },
    dropdownItemText: { fontFamily: F.body, fontSize: 16, color: theme.onSurface },
    dropdownItemTextActive: { color: theme.primary, fontFamily: F.bodyBold },
    tagCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    tag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: theme.surfaceContainerLowest, borderWidth: 1.5, borderColor: theme.outlineAlpha },
    tagActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    tagEmoji: { fontSize: 16 },
    tagText: { fontFamily: F.label, color: theme.onSurface, fontSize: 13 },
    tagTextActive: { color: theme.onPrimary },
    customTagRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    customTagInput: { flex: 1, height: 48, backgroundColor: theme.surfaceContainerLowest, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1.5, borderColor: theme.outlineAlpha, color: theme.onSurface },
    customTagAddBtn: { width: 48, height: 48, backgroundColor: theme.primaryAlpha, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    customTagAddBtnText: { fontSize: 24, color: theme.primary, fontWeight: '400', marginTop: -2 },
    photoSection: { marginBottom: 16 },
    photoGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: 4 },
    photoBox: {
        width: 72, height: 96, borderRadius: 12,
        backgroundColor: theme.card, borderWidth: 1.5,
        borderColor: theme.outlineAlpha, overflow: 'hidden',
        justifyContent: 'center', alignItems: 'center',
    },
    primaryPhoto: { borderWidth: 2, borderColor: theme.primary },
    image: { width: '100%', height: '100%' },
    addPhotoInner: { alignItems: 'center', gap: 4 },
    addPhotoPlus: { fontSize: 32, color: theme.outline },
    addPhotoLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 2, color: theme.primary },
    removeBtn: {
        position: 'absolute', top: 4, right: 4,
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
    },
    removeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: -2 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.surfaceContainerLowest, padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1.5, borderColor: theme.outlineAlpha },
    toggleInfo: { flex: 1 },
    toggleLabel: { fontFamily: F.bodyBold, fontSize: 15, color: theme.onSurface },
    toggleDesc: { fontFamily: F.body, fontSize: 12, color: theme.outline, marginTop: 2 }
});
