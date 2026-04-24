import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { F } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Plus, Search } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type PublicGroup = {
  id: string;
  name: string | null;
  created_at: string;
  metadata: any;
  participant_count: number;
};

function normalizeTag(t: string) {
  return t.trim();
}

export default function GroupsScreen() {
  const { theme: C } = useTheme();
  const styles = createStyles(C);
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ tag?: string; q?: string }>();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [search, setSearch] = useState<string>(typeof params.q === 'string' ? params.q : '');
  const [activeTag, setActiveTag] = useState<string>(typeof params.tag === 'string' ? params.tag : '');
  const [tags, setTags] = useState<{ id: string; name: string; emoji: string }[]>([]);
  const [groups, setGroups] = useState<PublicGroup[]>([]);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    setActiveTag(typeof params.tag === 'string' ? params.tag : '');
    setSearch(typeof params.q === 'string' ? params.q : '');
  }, [params.tag, params.q]);

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTag]);

  const fetchTags = async () => {
    const { data } = await supabase.from('tags').select('*').order('name').limit(50);
    if (data) setTags(data);
  };

  const fetchGroups = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('chats')
        .select('id, name, created_at, metadata')
        .eq('type', 'group')
        .eq('metadata->>is_public', 'true')
        .order('created_at', { ascending: false })
        .limit(50);

      const tag = normalizeTag(activeTag);
      if (tag) query = query.contains('metadata', { tags: [tag] } as any);

      const { data, error } = await query;
      if (error) throw error;

      const results: PublicGroup[] = [];
      for (const g of data || []) {
        const { count } = await supabase
          .from('chat_participants')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', g.id);
        results.push({ ...g, participant_count: count || 0 });
      }
      setGroups(results);
    } catch (e) {
      console.error('Error loading public groups', e);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(g => {
      const name = (g.name || '').toLowerCase();
      const icon = (g.metadata?.icon_emoji || '').toLowerCase();
      const tagsText = (g.metadata?.tags || []).join(' ').toLowerCase();
      return name.includes(q) || tagsText.includes(q) || icon.includes(q);
    });
  }, [groups, search]);

  const joinGroup = async (chatId: string) => {
    if (!user) return;
    setJoining(chatId);
    try {
      const { error } = await supabase.from('chat_participants').upsert({ chat_id: chatId, user_id: user.id });
      if (error) throw error;
      router.push(`/chat/${chatId}` as any);
    } catch (e) {
      console.error('Error joining group', e);
      alert('Could not join group. Please try again.');
    } finally {
      setJoining(null);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <ArrowLeft size={22} color={C.onSurface} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Groups</Text>
          <TouchableOpacity style={styles.createBtn} activeOpacity={0.85} onPress={() => router.push('/groups/create' as any)}>
            <Plus size={18} color={C.onPrimary} />
            <Text style={styles.createBtnText}>CREATE</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subTitle}>Join public group chats by suit or interest.</Text>

        <View style={styles.searchBox}>
          <Search size={18} color={C.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups, tags..."
            placeholderTextColor={C.secondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
          <TouchableOpacity style={[styles.tagChip, !activeTag && styles.tagChipActive]} onPress={() => setActiveTag('')} activeOpacity={0.85}>
            <Text style={[styles.tagChipText, !activeTag && styles.tagChipTextActive]}>All</Text>
          </TouchableOpacity>
          {tags.map(t => {
            const isActive = t.name === activeTag;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.tagChip, isActive && styles.tagChipActive]}
                onPress={() => setActiveTag(isActive ? '' : t.name)}
                activeOpacity={0.85}
              >
                <Text style={styles.tagEmoji}>{t.emoji}</Text>
                <Text style={[styles.tagChipText, isActive && styles.tagChipTextActive]}>{t.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={C.primary} size="large" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-group-outline" size={52} color={C.outlineAlpha} />
            <Text style={styles.emptyTitle}>No public groups yet</Text>
            <Text style={styles.emptyBody}>Create one, add tags, and make it public so others can find it.</Text>
          </View>
        ) : (
          filtered.map(g => {
            const icon = g.metadata?.icon_emoji || '♣';
            const tagsText = (g.metadata?.tags || []).slice(0, 3).join(' · ');
            return (
              <View key={g.id} style={styles.groupCard}>
                <View style={styles.groupIcon}>
                  <Text style={styles.groupIconText}>{icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.groupTopRow}>
                    <Text style={styles.groupName} numberOfLines={1}>{g.name || 'Group'}</Text>
                    <Text style={styles.groupMembers}>{g.participant_count} members</Text>
                  </View>
                  {!!tagsText && <Text style={styles.groupTags} numberOfLines={1}>{tagsText}</Text>}
                </View>
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={() => joinGroup(g.id)}
                  disabled={joining === g.id}
                  activeOpacity={0.85}
                >
                  {joining === g.id ? <ActivityIndicator color={C.onPrimary} /> : <Text style={styles.joinBtnText}>JOIN</Text>}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  topHeader: {
    paddingTop: Platform.OS === 'web' ? 16 : Platform.OS === 'ios' ? 54 : 44,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: C.surface,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.outlineAlpha,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 },
  pageTitle: { fontFamily: F.display, fontSize: 42, color: C.onSurface, letterSpacing: -1 },
  subTitle: { fontFamily: F.body, fontSize: 14, color: C.secondary, marginBottom: 18 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.outlineAlpha },
  createBtnText: { fontFamily: F.label, fontSize: 10, letterSpacing: 2, color: C.onPrimary },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surfaceContainerLowest, borderRadius: 14, paddingHorizontal: 16, height: 48, marginBottom: 14, borderWidth: 1, borderColor: C.outlineAlpha },
  searchInput: { flex: 1, fontFamily: F.body, fontSize: 15, color: C.onSurface },
  tagRow: { gap: 10, paddingRight: 20, paddingBottom: 10 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5, borderColor: C.outlineAlpha },
  tagChipActive: { backgroundColor: C.tertiary, borderColor: C.tertiary },
  tagChipText: { fontFamily: F.label, fontSize: 12, color: C.onSurface },
  tagChipTextActive: { color: C.onTertiary },
  tagEmoji: { fontSize: 14 },
  loadingWrap: { paddingVertical: 50, alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontFamily: F.display, fontSize: 22, color: C.onSurface },
  emptyBody: { fontFamily: F.body, fontSize: 14, color: C.secondary, textAlign: 'center' },
  groupCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surfaceContainerLowest, borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.outlineAlpha },
  groupIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.surfaceContainerLow, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.outlineAlpha },
  groupIconText: { fontSize: 20 },
  groupTopRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  groupName: { fontFamily: F.bodyBold, fontSize: 16, color: C.onSurface, flex: 1 },
  groupMembers: { fontFamily: F.label, fontSize: 10, color: C.secondary },
  groupTags: { fontFamily: F.body, fontSize: 12, color: C.secondary, marginTop: 2 },
  joinBtn: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, minWidth: 72, alignItems: 'center' },
  joinBtnText: { fontFamily: F.label, fontSize: 10, letterSpacing: 1.5, color: C.onPrimary },
});

