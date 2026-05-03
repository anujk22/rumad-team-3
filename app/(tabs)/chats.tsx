import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { F, formatTimeAgo, getInitials } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Check, Search, User, UserPlus, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type ChatPreview = {
  id: string;
  type: string;
  name: string | null;
  last_message: string;
  last_message_time: string;
  other_user_name: string;
  other_user_avatar: string | null;
  participant_count: number;
  metadata?: any;
};

type PersonRow = {
  id: string;
  first_name: string | null;
  avatar_urls: string[] | null;
  academic_year: string | null;
  major: string | null;
  friendship_status: 'none' | 'pending_outgoing' | 'pending_incoming' | 'friends';
};

export default function ChatsScreen() {
  const { theme: C } = useTheme();
  const styles = createStyles(C);
  const { user, profile } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'chats' | 'people'>('chats');
  const [peopleQuery, setPeopleQuery] = useState('');
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchChats();
      // Subscribe to new messages
      const channel = supabase
        .channel('chats-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
          fetchChats();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (tab !== 'people') return;
    searchPeople();
  }, [tab, peopleQuery, user]);

  const fetchChats = async () => {
    if (!user) return;
    try {
      // Get chat IDs user participates in
      const { data: participantData } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id);

      if (!participantData || participantData.length === 0) {
        setChats([]);
        setLoading(false);
        return;
      }

      const chatIds = participantData.map(p => p.chat_id);

      // Get chat details
      const { data: chatData } = await supabase
        .from('chats')
        .select('id, type, name, metadata')
        .in('id', chatIds);

      const previews: ChatPreview[] = [];

      for (const chat of chatData || []) {
        // Get latest message
        const { data: msgData } = await supabase
          .from('messages')
          .select('content, created_at, sender_id')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1);

        // Get other participants
        const { data: partData } = await supabase
          .from('chat_participants')
          .select('user_id, profiles(first_name, avatar_urls)')
          .eq('chat_id', chat.id)
          .neq('user_id', user.id);

        const otherUser = (partData && partData[0]) as any;
        const participantCount = (partData?.length || 0) + 1;
        const lastMsg = msgData?.[0];

        previews.push({
          id: chat.id,
          type: chat.type,
          name: chat.name || otherUser?.profiles?.first_name || 'Chat',
          last_message: lastMsg?.content || 'No messages yet',
          last_message_time: lastMsg?.created_at || new Date().toISOString(),
          other_user_name: otherUser?.profiles?.first_name || 'User',
          other_user_avatar: otherUser?.profiles?.avatar_urls?.[0] || null,
          participant_count: participantCount,
          metadata: (chat as any).metadata,
        });
      }

      // Sort by most recent message
      previews.sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());
      setChats(previews);
    } catch (err) {
      console.error('Error fetching chats:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFriendshipStatus = (rows: any[] | null | undefined, otherId: string): PersonRow['friendship_status'] => {
    if (!rows || rows.length === 0) return 'none';
    for (const r of rows) {
      if (r.status !== 'accepted' && r.status !== 'pending') continue;
      if (r.requester_id === user?.id && r.addressee_id === otherId) return r.status === 'accepted' ? 'friends' : 'pending_outgoing';
      if (r.addressee_id === user?.id && r.requester_id === otherId) return r.status === 'accepted' ? 'friends' : 'pending_incoming';
    }
    return 'none';
  };

  const searchPeople = async () => {
    if (!user) return;
    const q = peopleQuery.trim();
    setPeopleLoading(true);
    try {
      let profilesQuery = supabase
        .from('profiles')
        .select('id, first_name, avatar_urls, academic_year, major')
        .eq('onboarding_completed', true)
        .neq('id', user.id)
        .order('updated_at', { ascending: false })
        .limit(25);

      if (q) {
        profilesQuery = profilesQuery.ilike('first_name', `%${q}%`);
      }

      const { data: profs, error: profErr } = await profilesQuery;
      if (profErr) throw profErr;

      const ids = (profs || []).map(p => p.id);
      const { data: fr } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id, status')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .in('requester_id', [user.id, ...ids])
        .in('addressee_id', [user.id, ...ids]);

      const peopleRows: PersonRow[] = (profs || []).map(p => ({
        id: p.id,
        first_name: (p as any).first_name,
        avatar_urls: (p as any).avatar_urls || [],
        academic_year: (p as any).academic_year,
        major: (p as any).major,
        friendship_status: getFriendshipStatus(fr as any, p.id),
      }));
      setPeople(peopleRows);
    } catch (e) {
      console.error('Error searching people', e);
      setPeople([]);
    } finally {
      setPeopleLoading(false);
    }
  };

  const requestFriend = async (otherId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('friendships').insert({
        requester_id: user.id,
        addressee_id: otherId,
        status: 'pending',
      });
      if (error) throw error;
      searchPeople();
    } catch (e) {
      console.error('Error requesting friend', e);
      alert('Could not send request.');
    }
  };

  const acceptFriend = async (otherId: string) => {
    if (!user) return;
    try {
      const { data: row } = await supabase
        .from('friendships')
        .select('id')
        .eq('requester_id', otherId)
        .eq('addressee_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();
      if (!row?.id) return;
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', row.id);
      if (error) throw error;
      searchPeople();
    } catch (e) {
      console.error('Error accepting friend', e);
      alert('Could not accept request.');
    }
  };

  const filteredChats = chats.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const directChats = filteredChats.filter(c => c.type === 'direct');
  const groupChats = filteredChats.filter(c => c.type !== 'direct');

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Chats</Text>
          <TouchableOpacity style={styles.groupShortcut} onPress={() => router.push('/groups/create' as any)} activeOpacity={0.85}>
            <Users size={18} color={C.onPrimary} />
            <Text style={styles.groupShortcutText}>GROUP</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.topTabs}>
          <TouchableOpacity style={[styles.topTabBtn, tab === 'chats' && styles.topTabBtnActive]} onPress={() => setTab('chats')} activeOpacity={0.85}>
            <Text style={[styles.topTabText, tab === 'chats' && styles.topTabTextActive]}>Chats</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.topTabBtn, tab === 'people' && styles.topTabBtnActive]} onPress={() => setTab('people')} activeOpacity={0.85}>
            <Text style={[styles.topTabText, tab === 'people' && styles.topTabTextActive]}>People</Text>
          </TouchableOpacity>
        </View>

        {tab === 'chats' ? (
          <>
            {/* Search */}
            <View style={styles.searchBox}>
              <Search size={18} color={C.secondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search conversations..."
                placeholderTextColor={C.secondary}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {/* Inner Circle (Direct Matches) */}
            {directChats.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>INNER CIRCLE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.circleScroll}>
                  {directChats.map(chat => (
                    <TouchableOpacity
                      key={chat.id}
                      style={styles.circleItem}
                      onPress={() => router.push(`/chat/${chat.id}` as any)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.circleAvatar}>
                        {chat.other_user_avatar ? (
                          <Image source={{ uri: chat.other_user_avatar }} style={styles.circleAvatarImg} />
                        ) : (
                          <Text style={styles.circleInitials}>{getInitials(chat.other_user_name)}</Text>
                        )}
                      </View>
                      <Text style={styles.circleName} numberOfLines={1}>{chat.other_user_name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* All Conversations */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CONVERSATIONS</Text>
              {filteredChats.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="chat-outline" size={48} color={C.outlineAlpha} />
                  <Text style={styles.emptyTitle}>No conversations yet</Text>
                  <Text style={styles.emptyBody}>Swipe right or hit "Deal Me In" to start chatting!</Text>
                </View>
              ) : (
                filteredChats.map(chat => (
                  <TouchableOpacity
                    key={chat.id}
                    style={styles.chatRow}
                    onPress={() => router.push(`/chat/${chat.id}` as any)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.chatAvatar}>
                      {chat.type === 'direct' && chat.other_user_avatar ? (
                        <Image source={{ uri: chat.other_user_avatar }} style={styles.chatAvatarImg} />
                      ) : chat.type === 'spontaneous' ? (
                        <MaterialCommunityIcons name="cards-playing" size={22} color={C.primary} />
                      ) : chat.type === 'study_crew' ? (
                        <MaterialCommunityIcons name="school" size={22} color={C.tertiary} />
                      ) : chat.type === 'group' && chat.metadata?.icon_emoji ? (
                        <Text style={styles.groupEmoji}>{chat.metadata.icon_emoji}</Text>
                      ) : chat.type === 'group' ? (
                        <Users size={22} color={C.tertiary} />
                      ) : (
                        <User size={22} color={C.outline} />
                      )}
                    </View>
                    <View style={styles.chatInfo}>
                      <View style={styles.chatTopRow}>
                        <Text style={styles.chatName} numberOfLines={1}>
                          {chat.type === 'direct' ? chat.other_user_name : chat.name}
                        </Text>
                        <Text style={styles.chatTime}>{formatTimeAgo(chat.last_message_time)}</Text>
                      </View>
                      <Text style={styles.chatPreview} numberOfLines={1}>{chat.last_message}</Text>
                      {chat.participant_count > 2 && (
                        <Text style={styles.chatParticipants}>{chat.participant_count} members</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.searchBox}>
              <Search size={18} color={C.secondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search people by first name..."
                placeholderTextColor={C.secondary}
                value={peopleQuery}
                onChangeText={setPeopleQuery}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PEOPLE</Text>
              {peopleLoading ? (
                <View style={styles.loadingInline}>
                  <ActivityIndicator color={C.primary} />
                </View>
              ) : people.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="account-search-outline" size={48} color={C.outlineAlpha} />
                  <Text style={styles.emptyTitle}>No matches</Text>
                  <Text style={styles.emptyBody}>Try searching a different first name.</Text>
                </View>
              ) : (
                people.map(p => {
                  const avatar = p.avatar_urls?.[0] || null;
                  const subtitle = [p.academic_year, p.major].filter(Boolean).join(' · ');
                  const isOutgoing = p.friendship_status === 'pending_outgoing';
                  const isIncoming = p.friendship_status === 'pending_incoming';
                  const isFriends = p.friendship_status === 'friends';
                  return (
                    <View key={p.id} style={styles.personRow}>
                      <View style={styles.personAvatar}>
                        {avatar ? (
                          <Image source={{ uri: avatar }} style={styles.personAvatarImg} />
                        ) : (
                          <Text style={styles.personInitials}>{getInitials(p.first_name || 'User')}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.personName} numberOfLines={1}>{p.first_name || 'User'}</Text>
                        {!!subtitle && <Text style={styles.personSub} numberOfLines={1}>{subtitle}</Text>}
                      </View>
                      {isFriends ? (
                        <View style={styles.friendBadge}>
                          <Check size={14} color={C.onTertiary} />
                          <Text style={styles.friendBadgeText}>Friends</Text>
                        </View>
                      ) : isIncoming ? (
                        <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptFriend(p.id)} activeOpacity={0.85}>
                          <Text style={styles.acceptBtnText}>ACCEPT</Text>
                        </TouchableOpacity>
                      ) : isOutgoing ? (
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingBadgeText}>Pending</Text>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.addBtn} onPress={() => requestFriend(p.id)} activeOpacity={0.85}>
                          <UserPlus size={16} color={C.onPrimary} />
                          <Text style={styles.addBtnText}>ADD</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  scrollContent: { padding: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 },
  pageTitle: { fontFamily: F.display, fontSize: 42, color: C.onSurface, letterSpacing: -1 },
  groupShortcut: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.outlineAlpha },
  groupShortcutText: { fontFamily: F.label, fontSize: 10, letterSpacing: 2, color: C.onPrimary },
  topTabs: { flexDirection: 'row', backgroundColor: C.surfaceContainerHigh, borderRadius: 999, padding: 6, marginBottom: 16 },
  topTabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 999 },
  topTabBtnActive: { backgroundColor: C.tertiary },
  topTabText: { fontFamily: F.label, fontSize: 11, letterSpacing: 2, color: C.onSurfaceVariant, textTransform: 'uppercase' },
  topTabTextActive: { color: C.onTertiary },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surfaceContainerLowest, borderRadius: 14, paddingHorizontal: 16, height: 48, marginBottom: 24, borderWidth: 1, borderColor: C.outlineAlpha },
  searchInput: { flex: 1, fontFamily: F.body, fontSize: 15, color: C.onSurface },
  section: { marginBottom: 24 },
  sectionLabel: { fontFamily: F.labelExtra, fontSize: 10, letterSpacing: 2, color: C.onSurfaceVariant, marginBottom: 12 },
  circleScroll: { gap: 16, paddingRight: 20 },
  circleItem: { alignItems: 'center', width: 64 },
  circleAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.surfaceContainerLow, borderWidth: 2, borderColor: C.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 6 },
  circleAvatarImg: { width: '100%', height: '100%' },
  circleInitials: { fontFamily: F.labelExtra, fontSize: 18, color: C.primary },
  circleName: { fontFamily: F.label, fontSize: 11, color: C.onSurface },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontFamily: F.display, fontSize: 22, color: C.onSurface },
  emptyBody: { fontFamily: F.body, fontSize: 14, color: C.secondary, textAlign: 'center' },
  chatRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceContainerLowest, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.outlineAlpha },
  chatAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.surfaceContainerLow, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginRight: 14 },
  chatAvatarImg: { width: '100%', height: '100%' },
  groupEmoji: { fontSize: 24, color: C.onSurface },
  chatInfo: { flex: 1 },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { fontFamily: F.bodyBold, fontSize: 16, color: C.onSurface, flex: 1, marginRight: 8 },
  chatTime: { fontFamily: F.label, fontSize: 10, color: C.secondary },
  chatPreview: { fontFamily: F.body, fontSize: 13, color: C.secondary },
  chatParticipants: { fontFamily: F.label, fontSize: 10, color: C.tertiary, marginTop: 4 },
  loadingInline: { paddingVertical: 22, alignItems: 'center' },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surfaceContainerLowest, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.outlineAlpha },
  personAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.surfaceContainerLow, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: C.outlineAlpha },
  personAvatarImg: { width: '100%', height: '100%' },
  personInitials: { fontFamily: F.labelExtra, fontSize: 14, color: C.primary },
  personName: { fontFamily: F.bodyBold, fontSize: 16, color: C.onSurface },
  personSub: { fontFamily: F.body, fontSize: 12, color: C.secondary, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  addBtnText: { fontFamily: F.label, fontSize: 10, letterSpacing: 1.5, color: C.onPrimary },
  pendingBadge: { backgroundColor: C.surfaceContainerHigh, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.outlineAlpha },
  pendingBadgeText: { fontFamily: F.label, fontSize: 10, letterSpacing: 1.5, color: C.onSurfaceVariant },
  acceptBtn: { backgroundColor: C.tertiary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  acceptBtnText: { fontFamily: F.label, fontSize: 10, letterSpacing: 1.5, color: C.onTertiary },
  friendBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.tertiary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  friendBadgeText: { fontFamily: F.label, fontSize: 10, letterSpacing: 1.5, color: C.onTertiary },
});
