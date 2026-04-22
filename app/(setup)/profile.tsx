import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ProfileSetupScreen() {
    const { user } = useAuth();
    const router = useRouter();

    const [firstName, setFirstName] = useState('');
    const [age, setAge] = useState('');
    const [photos, setPhotos] = useState<string[]>([null, null, null]);
    const [uploading, setUploading] = useState(false);

    const pickImage = async (index: number) => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            const newPhotos = [...photos];
            newPhotos[index] = `data:image/jpeg;base64,${result.assets[0].base64}`;
            setPhotos(newPhotos);
        }
    };

    const uploadPhotoToSupabase = async (base64Str: string, index: number) => {
        try {
            if (!user) return null;

            const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, "");
            const filePath = `${user.id}/${Date.now()}_${index}.jpg`;

            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(filePath, decode(base64Data), {
                    contentType: 'image/jpeg'
                });

            if (error) {
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('Error uploading image: ', error);
            return null;
        }
    };

    const handleContinue = async () => {
        if (!firstName.trim()) {
            Alert.alert('Missing Info', 'Please enter your first name.');
            return;
        }
        if (!age || isNaN(Number(age)) || Number(age) < 16 || Number(age) > 99) {
            Alert.alert('Invalid Age', 'Please enter a valid age.');
            return;
        }
        if (!photos[0]) {
            Alert.alert('Photo Required', 'Please upload at least one primary photo.');
            return;
        }

        setUploading(true);

        try {
            const uploadedUrls = [];
            for (let i = 0; i < photos.length; i++) {
                if (photos[i]) {
                    const url = await uploadPhotoToSupabase(photos[i], i);
                    if (url) uploadedUrls.push(url);
                }
            }

            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user?.id,
                    first_name: firstName.trim(),
                    age: parseInt(age),
                    avatar_urls: uploadedUrls,
                    updated_at: new Date().toISOString(),
                });

            if (error) throw error;

            router.push('/(setup)/questionnaire');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save profile');
        } finally {
            setUploading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Welcome.</Text>
                <Text style={styles.subtitle}>Let's set up your profile.</Text>

                <View style={styles.photoGrid}>
                    {/* Primary Photo (Large) */}
                    <TouchableOpacity
                        style={[styles.photoBox, styles.primaryPhoto]}
                        onPress={() => pickImage(0)}
                    >
                        {photos[0] ? (
                            <Image source={{ uri: photos[0] }} style={styles.image} />
                        ) : (
                            <Text style={styles.addPhotoText}>+</Text>
                        )}
                    </TouchableOpacity>

                    {/* Secondary Photos */}
                    <View style={styles.secondaryPhotosContainer}>
                        <TouchableOpacity style={styles.photoBox} onPress={() => pickImage(1)}>
                            {photos[1] ? <Image source={{ uri: photos[1] }} style={styles.image} /> : <Text style={styles.addPhotoText}>+</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.photoBox} onPress={() => pickImage(2)}>
                            {photos[2] ? <Image source={{ uri: photos[2] }} style={styles.image} /> : <Text style={styles.addPhotoText}>+</Text>}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>First Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Scarlet"
                        placeholderTextColor="#555"
                        value={firstName}
                        onChangeText={setFirstName}
                    />

                    <Text style={styles.label}>Age</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="19"
                        placeholderTextColor="#555"
                        keyboardType="number-pad"
                        maxLength={2}
                        value={age}
                        onChangeText={setAge}
                    />
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleContinue}
                    disabled={uploading}
                >
                    <Text style={styles.buttonText}>{uploading ? 'Saving...' : 'Continue'}</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fcf9f8',
    },
    scrollContent: {
        padding: 24,
        paddingTop: 80,
        paddingBottom: 40,
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
    photoGrid: {
        flexDirection: 'row',
        marginBottom: 40,
        height: 240,
    },
    primaryPhoto: {
        flex: 2,
        marginRight: 16,
    },
    secondaryPhotosContainer: {
        flex: 1,
        justifyContent: 'space-between',
    },
    photoBox: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(228,190,186,0.5)',
        height: '100%',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    addPhotoText: {
        fontSize: 32,
        color: 'rgba(228,190,186,0.8)',
    },
    form: {
        marginBottom: 40,
    },
    label: {
        color: '#5f5e5e',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: '#ffffff',
        color: '#1b1c1c',
        height: 56,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 18,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(228,190,186,0.3)',
    },
    button: {
        backgroundColor: '#af101a',
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
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
