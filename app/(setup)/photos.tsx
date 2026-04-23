import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MAX_PHOTOS = 6;

export default function PhotosScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [photos, setPhotos] = useState<(string | null)[]>(Array(MAX_PHOTOS).fill(null));
    const [uploading, setUploading] = useState(false);

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

    const uploadPhotoToSupabase = async (base64Str: string, index: number): Promise<string | null> => {
        try {
            if (!user) return null;
            const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, '');
            const filePath = `${user.id}/${Date.now()}_${index}.jpg`;

            const { error } = await supabase.storage
                .from('avatars')
                .upload(filePath, decode(base64Data), { contentType: 'image/jpeg' });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
            return publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            return null;
        }
    };

    const handleContinue = async () => {
        const hasPhotos = photos.some(p => p !== null);
        if (!hasPhotos) {
            Alert.alert('Photo Required', 'Please upload at least one photo — it helps others recognize you!');
            return;
        }

        setUploading(true);
        try {
            const uploadedUrls: string[] = [];
            for (let i = 0; i < photos.length; i++) {
                if (photos[i]) {
                    const url = await uploadPhotoToSupabase(photos[i]!, i);
                    if (url) uploadedUrls.push(url);
                }
            }

            const { error } = await supabase
                .from('profiles')
                .update({
                    avatar_urls: uploadedUrls,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user?.id);

            if (error) throw error;
            router.push('/(setup)/preferences');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to upload photos.');
        } finally {
            setUploading(false);
        }
    };

    const handleSkip = () => {
        router.push('/(setup)/preferences');
    };

    const photoCount = photos.filter(p => p !== null).length;

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.stepRow}>
                    {[1, 2, 3, 4, 5].map(s => (
                        <View key={s} style={[styles.stepDot, s <= 4 && styles.stepDotActive]} />
                    ))}
                </View>

                <Text style={styles.eyebrow}>STEP 4 OF 5</Text>
                <Text style={styles.title}>Show Yourself.</Text>
                <Text style={styles.subtitle}>
                    Upload up to {MAX_PHOTOS} photos. Your first photo will be your profile picture.
                </Text>

                <View style={styles.divider} />

                <View style={styles.photoGrid}>
                    {photos.map((photo, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.photoBox,
                                index === 0 && styles.primaryPhoto,
                            ]}
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
                                    {index === 0 && <Text style={styles.addPhotoLabel}>PRIMARY</Text>}
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.photoCountText}>
                    {photoCount} / {MAX_PHOTOS} photos added
                </Text>

                <TouchableOpacity
                    style={[styles.button, uploading && styles.buttonDisabled]}
                    onPress={handleContinue}
                    disabled={uploading}
                >
                    {uploading ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text style={styles.buttonText}>Continue</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                    <Text style={styles.skipBtnText}>Skip for now</Text>
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
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
    photoBox: {
        width: '30%', aspectRatio: 3 / 4, borderRadius: 16,
        backgroundColor: '#ffffff', borderWidth: 1.5,
        borderColor: 'rgba(228,190,186,0.4)', overflow: 'hidden',
        justifyContent: 'center', alignItems: 'center',
    },
    primaryPhoto: { width: '62%' },
    image: { width: '100%', height: '100%' },
    addPhotoInner: { alignItems: 'center', gap: 4 },
    addPhotoPlus: { fontSize: 32, color: 'rgba(228,190,186,0.8)' },
    addPhotoLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 2, color: '#af101a' },
    removeBtn: {
        position: 'absolute', top: 8, right: 8,
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
    },
    removeBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: -2 },
    photoCountText: { fontSize: 13, color: '#8f6f6c', textAlign: 'center', marginBottom: 32 },
    button: {
        backgroundColor: '#af101a', height: 56, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#af101a', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    },
    buttonDisabled: { backgroundColor: '#c8b0af' },
    buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
    skipBtn: { marginTop: 16, alignItems: 'center', paddingVertical: 12 },
    skipBtnText: { fontSize: 14, color: '#af101a', fontWeight: '600' },
});
