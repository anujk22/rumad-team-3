import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { F } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { ArrowLeft, Globe, Lock, Plus, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CreateGroupScreen() {
  const { theme: C } = useTheme();
  const styles = createStyles(C);
  const { user } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [iconEmoji, setIconEmoji] = useState('♣');
  const [isPublic, setIsPublic] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(() => name.trim().length >= 2 && !!user && !saving, [name, user, saving]);

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (tags.some(x => x.toLowerCase() === t.toLowerCase())) { setTagInput(''); return; }
    setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t));

  const createGroup = async () => {
    if (!user) return;
    const trimmedName = name.trim();
    if (trimmedName.length < 2) return;
    setSaving(true);
    try {
      const metadata = {
        is_public: isPublic,
        icon_emoji: iconEmoji.trim() || '♣',
        tags,
        created_by: user.id,
      };

      const { data: chat, error } = await supabase
        .from('chats')
        .insert({ type: 'group', name: trimmedName, metadata })
        .select()
        .single();
      if (error) throw error;

      const { error: joinErr } = await supabase
        .from('chat_participants')
        .insert({ chat_id: chat.id, user_id: user.id });
      if (joinErr) throw joinErr;

      router.replace(`/chat/${chat.id}` as any);
    } catch (e) {
      console.error('Error creating group', e);
      alert('Could not create group. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)/chats' as any)} activeOpacity={0.8}>
          <ArrowLeft size={22} color={C.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Group</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.label}>NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Freshman Foodies"
            placeholderTextColor={C.secondary}
            value={name}
            onChangeText={setName}
            maxLength={48}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>ICON</Text>
              <TextInput
                style={styles.input}
                placeholder="Emoji"
                placeholderTextColor={C.secondary}
                value={iconEmoji}
                onChangeText={setIconEmoji}
                maxLength={3}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>VISIBILITY</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, !isPublic && styles.toggleBtnActive]}
                  onPress={() => setIsPublic(false)}
                  activeOpacity={0.85}
                >
                  <Lock size={14} color={!isPublic ? C.onTertiary : C.onSurfaceVariant} />
                  <Text style={[styles.toggleText, !isPublic && styles.toggleTextActive]}>Private</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, isPublic && styles.toggleBtnActive]}
                  onPress={() => setIsPublic(true)}
                  activeOpacity={0.85}
                >
                  <Globe size={14} color={isPublic ? C.onTertiary : C.onSurfaceVariant} />
                  <Text style={[styles.toggleText, isPublic && styles.toggleTextActive]}>Public</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helpText}>
                {isPublic ? 'Public groups appear in Browse Suits.' : 'Private by default. Invite-only for now.'}
              </Text>
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>TAGS</Text>
          <View style={styles.tagInputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Add a tag (e.g. Cooking)"
              placeholderTextColor={C.secondary}
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addTagBtn} onPress={addTag} activeOpacity={0.85}>
              <Plus size={18} color={C.onPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.tagsWrap}>
            {tags.map(t => (
              <View key={t} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{t}</Text>
                <TouchableOpacity onPress={() => removeTag(t)} style={styles.tagChipX} activeOpacity={0.8}>
                  <X size={14} color={C.onSurface} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={createGroup}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color={C.onPrimary} /> : <Text style={styles.saveBtnText}>CREATE GROUP</Text>}
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.outlineAlpha },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surfaceContainerLow, borderWidth: 1, borderColor: C.outlineAlpha },
  headerTitle: { fontFamily: F.bodyBold, fontSize: 18, color: C.onSurface },
  scrollContent: { padding: 20 },
  card: { backgroundColor: C.card, borderRadius: 24, padding: 18, borderWidth: 1.5, borderColor: C.outlineAlpha, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3 },
  label: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 2, color: C.onSurfaceVariant, marginBottom: 10 },
  input: { backgroundColor: C.surfaceContainerLow, borderWidth: 1, borderColor: C.outlineAlpha, borderRadius: 14, height: 48, paddingHorizontal: 14, fontFamily: F.body, fontSize: 15, color: C.onSurface },
  row: { flexDirection: 'row', marginTop: 16, alignItems: 'flex-start' },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, backgroundColor: C.surfaceContainerLow, borderWidth: 1, borderColor: C.outlineAlpha },
  toggleBtnActive: { backgroundColor: C.tertiary, borderColor: C.tertiary },
  toggleText: { fontFamily: F.label, fontSize: 12, color: C.onSurfaceVariant },
  toggleTextActive: { color: C.onTertiary },
  helpText: { fontFamily: F.body, fontSize: 12, color: C.secondary, marginTop: 8 },
  tagInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  addTagBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.outlineAlpha },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surfaceContainerLow, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: C.outlineAlpha },
  tagChipText: { fontFamily: F.label, fontSize: 12, color: C.onSurface },
  tagChipX: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { marginTop: 16, backgroundColor: C.primary, borderRadius: 18, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: C.outlineAlpha, shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 18, elevation: 6 },
  saveBtnDisabled: { backgroundColor: C.surfaceContainerHigh, shadowOpacity: 0, elevation: 0 },
  saveBtnText: { fontFamily: F.label, fontSize: 11, letterSpacing: 2, color: C.onPrimary },
});

