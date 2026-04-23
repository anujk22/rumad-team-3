import { useTheme } from '@/hooks/useTheme';
import { useAuth, Profile } from '@/hooks/useAuth';
import { C, F, formatTimeAgo, getInitials } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MessageSquare, Search, User } from 'lucide-react-native';
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
};

export default function ChatsScreen() {
    const { theme: C } = useTheme();
    const styles = createStyles(C);
  const { user, profile } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
        .select('id, type, name')
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
        <Text style={styles.pageTitle}>Chats</Text>

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
              <MaterialCommunityIcons name="chat-outline" size={48} color={C.outlineVariant} />
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

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surfaceContainer },
  scrollContent: { padding: 20 },
  pageTitle: { fontFamily: F.display, fontSize: 42, color: C.onSurface, letterSpacing: -1, marginBottom: 16 },
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
  chatInfo: { flex: 1 },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { fontFamily: F.bodyBold, fontSize: 16, color: C.onSurface, flex: 1, marginRight: 8 },
  chatTime: { fontFamily: F.label, fontSize: 10, color: C.secondary },
  chatPreview: { fontFamily: F.body, fontSize: 13, color: C.secondary },
  chatParticipants: { fontFamily: F.label, fontSize: 10, color: C.tertiary, marginTop: 4 },
});
