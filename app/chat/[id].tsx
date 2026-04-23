import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { F, getInitials } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, Send } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, KeyboardAvoidingView,
  Platform, SafeAreaView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';

type Message = {
  id: string;
  content: string;
  media_url: string | null;
  sender_id: string;
  created_at: string;
  sender_name: string;
  sender_avatar: string | null;
};

type Participant = {
  user_id: string;
  name: string;
  avatar: string | null;
};

export default function ChatScreen() {
  const { theme: C } = useTheme();
  const styles = createStyles(C);
  const msgStyles = createMsgStyles(C);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatName, setChatName] = useState('Chat');
  const [chatType, setChatType] = useState('direct');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    loadChat();
    loadMessages();

    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${id}` },
        async (payload) => {
          const newMsg = payload.new as any;
          const sender = participants.find(p => p.user_id === newMsg.sender_id);
          const enrichedMsg: Message = {
            id: newMsg.id,
            content: newMsg.content,
            media_url: newMsg.media_url,
            sender_id: newMsg.sender_id,
            created_at: newMsg.created_at,
            sender_name: sender?.name || 'User',
            sender_avatar: sender?.avatar || null,
          };
          setMessages(prev => [...prev, enrichedMsg]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  const loadChat = async () => {
    const { data: chat } = await supabase
      .from('chats')
      .select('name, type')
      .eq('id', id)
      .single();

    if (chat) {
      setChatType(chat.type);
    }

    const { data: parts } = await supabase
      .from('chat_participants')
      .select('user_id, profiles(first_name, avatar_urls)')
      .eq('chat_id', id);

    const parsedParts: Participant[] = (parts || []).map((p: any) => ({
      user_id: p.user_id,
      name: p.profiles?.first_name || 'User',
      avatar: p.profiles?.avatar_urls?.[0] || null,
    }));

    setParticipants(parsedParts);

    if (chat?.type === 'direct') {
      const other = parsedParts.find(p => p.user_id !== user?.id);
      setChatName(other?.name || 'Chat');
    } else {
      setChatName(chat?.name || 'Group Chat');
    }
  };

  const loadMessages = async () => {
    try {
      const { data } = await supabase
        .from('messages')
        .select('id, content, media_url, sender_id, created_at')
        .eq('chat_id', id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (!data) { setLoading(false); return; }

      const senderIds = [...new Set(data.map(m => m.sender_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, avatar_urls')
        .in('id', senderIds);

      const profileMap = new Map((profilesData || []).map(p => [p.id, p]));

      const enriched: Message[] = data.map(m => {
        const profile = profileMap.get(m.sender_id);
        return {
          ...m,
          sender_name: profile?.first_name || 'User',
          sender_avatar: profile?.avatar_urls?.[0] || null,
        };
      });

      setMessages(enriched);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !user || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    try {
      await supabase.from('messages').insert({
        chat_id: id,
        sender_id: user.id,
        content: text,
      });
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const sendImage = async () => {
    if (!user) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0].base64) return;

    try {
      const base64Data = result.assets[0].base64;
      const filePath = `${id}/${Date.now()}.jpg`;

      await supabase.storage
        .from('chat-media')
        .upload(filePath, decode(base64Data), { contentType: 'image/jpeg' });

      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(filePath);

      await supabase.from('messages').insert({
        chat_id: id,
        sender_id: user.id,
        content: '📷 Photo',
        media_url: publicUrl,
      });
    } catch (err) {
      console.error('Error sending image:', err);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.sender_id === user?.id;
    return (
      <View style={[msgStyles.row, isMine && msgStyles.rowMine]}>
        {!isMine && chatType !== 'direct' && (
          <View style={msgStyles.avatarSmall}>
            {item.sender_avatar ? (
              <Image source={{ uri: item.sender_avatar }} style={msgStyles.avatarImg} />
            ) : (
              <Text style={msgStyles.avatarInitials}>{getInitials(item.sender_name)}</Text>
            )}
          </View>
        )}
        <View style={[msgStyles.bubble, isMine ? msgStyles.bubbleMine : msgStyles.bubbleOther]}>
          {!isMine && chatType !== 'direct' && (
            <Text style={msgStyles.senderName}>{item.sender_name}</Text>
          )}
          {item.media_url && (
            <Image source={{ uri: item.media_url }} style={msgStyles.mediaImg} />
          )}
          <Text style={[msgStyles.text, isMine && msgStyles.textMine]}>{item.content}</Text>
          <Text style={[msgStyles.time, isMine && msgStyles.timeMine]}>
            {new Date(item.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={C.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{chatName}</Text>
          <Text style={styles.headerSub}>
            {chatType === 'direct' ? 'Direct Message' : `${participants.length} members`}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          onLayout={() => flatListRef.current?.scrollToEnd()}
        />
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.mediaBtn} onPress={sendImage}>
            <ImageIcon size={22} color={C.onSurfaceVariant} />
          </TouchableOpacity>
          <TextInput
            style={styles.inputField}
            placeholder="Message..."
            placeholderTextColor={C.secondary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || sending}
          >
            <Send size={18} color={input.trim() ? C.onPrimary : C.outline} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createMsgStyles = (C: any) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8, paddingHorizontal: 16 },
  rowMine: { flexDirection: 'row-reverse' },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.surfaceContainerLow, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginRight: 8 },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitials: { fontFamily: F.labelExtra, fontSize: 10, color: C.primary },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 18 },
  bubbleMine: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: C.surfaceContainerHigh, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.outlineAlpha },
  senderName: { fontFamily: F.label, fontSize: 10, color: C.tertiary, marginBottom: 4 },
  text: { fontFamily: F.body, fontSize: 15, color: C.onSurface, lineHeight: 21 },
  textMine: { color: C.onPrimary },
  time: { fontFamily: F.label, fontSize: 9, color: C.secondary, textAlign: 'right', marginTop: 4 },
  timeMine: { color: 'rgba(255,255,255,0.7)' },
  mediaImg: { width: 200, height: 200, borderRadius: 12, marginBottom: 8 },
});

const createStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surfaceContainerHigh },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.outlineAlpha,
    paddingTop: Platform.OS === 'ios' ? 8 : Platform.OS === 'web' ? 16 : 12,
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerInfo: { flex: 1 },
  headerTitle: { fontFamily: F.bodyBold, fontSize: 18, color: C.onSurface },
  headerSub: { fontFamily: F.label, fontSize: 11, color: C.secondary },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  msgList: { paddingVertical: 16 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: C.card,
    borderTopWidth: 1, borderTopColor: C.outlineAlpha,
  },
  mediaBtn: { padding: 10, borderRadius: 12, backgroundColor: C.surfaceContainerLow },
  inputField: {
    flex: 1, fontFamily: F.body, fontSize: 15, color: C.onSurface,
    backgroundColor: C.surfaceContainerLow, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: C.surfaceContainerLow },
});
