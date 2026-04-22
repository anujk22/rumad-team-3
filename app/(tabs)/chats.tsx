import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { PlusCircle, UserPlus, Star } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const C = {
  surfaceContainer: '#f0eded',
  surfaceContainerLow: '#f6f3f2',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerHighest: '#e5e2e1',
  outlineVariant: 'rgba(228,190,186,0.8)',
  outline: '#8f6f6c',
  primary: '#af101a',
  onPrimary: '#ffffff',
  secondary: '#5f5e5e',
  onSurface: '#1b1c1c',
  tertiary: '#705d00',
  tertiaryContainer: '#c9a900',
  onTertiaryContainer: '#4c3f00',
};

const F = {
  headline: 'AbhayaLibre_800ExtraBold',
  body: 'Manrope_400Regular',
  bodyBold: 'Manrope_700Bold',
  label: 'PlusJakartaSans_700Bold',
  labelExtra: 'PlusJakartaSans_800ExtraBold',
};

type Friend = {
  id: string;
  first_name: string;
  avatar_url: string;
  suit: 'heart' | 'spade' | 'diamond' | 'club';
};

const MOCK_FRIENDS: Friend[] = [
  { id: 'f1', first_name: 'Sophia', avatar_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80', suit: 'heart' },
  { id: 'f2', first_name: 'Marcus', avatar_url: 'https://images.unsplash.com/photo-1549471156-52ee71691122?w=800&q=80', suit: 'spade' },
  { id: 'f3', first_name: 'Elena', avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80', suit: 'diamond' },
  { id: 'f4', first_name: 'Julian', avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80', suit: 'club' },
];

type ChatItem = {
  id: string;
  type: 'direct' | 'group' | 'inactive';
  name: string;
  avatar_url?: string;
  lastMessage: string;
  timeAgo: string;
  suit: 'heart' | 'spade' | 'diamond' | 'club' | 'star';
  unread?: boolean;
};

const MOCK_CHATS: ChatItem[] = [
  { id: 'c1', type: 'direct', name: 'Sophia R.', avatar_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80', lastMessage: 'That jazz club last night was ama...', timeAgo: '2M AGO', suit: 'heart', unread: true },
  { id: 'c2', type: 'group', name: "Architecture '27 Deck", lastMessage: "Leo: Who's in the studio right now?", timeAgo: '15M AGO', suit: 'star', unread: false },
  { id: 'c3', type: 'direct', name: 'Marcus King', avatar_url: 'https://images.unsplash.com/photo-1549471156-52ee71691122?w=800&q=80', lastMessage: 'Ready for the finals next week?', timeAgo: '1H AGO', suit: 'spade', unread: false },
  { id: 'c4', type: 'direct', name: 'Elena V.', avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80', lastMessage: "It's a deal! Coffee at 4.", timeAgo: '3H AGO', suit: 'diamond', unread: false },
  { id: 'c5', type: 'inactive', name: 'Julian M.', avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80', lastMessage: 'See you around campus!', timeAgo: '1D AGO', suit: 'club', unread: false },
];

export default function ChatsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [activeFriends, setActiveFriends] = useState<Friend[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setTimeout(() => {
      setActiveFriends(MOCK_FRIENDS);
      setChatRooms(MOCK_CHATS);
      setLoading(false);
    }, 400);
  };

  const getSuitIcon = (suit: string, size = 10) => {
    switch (suit) {
      case 'heart': return <MaterialCommunityIcons name="cards-heart" size={size} color="#fff" />;
      case 'spade': return <MaterialCommunityIcons name="cards-spade" size={size} color="#fff" />;
      case 'diamond': return <MaterialCommunityIcons name="cards-diamond" size={size} color="#fff" />;
      case 'club': return <MaterialCommunityIcons name="cards-club" size={size} color="#fff" />;
      case 'star': return <Star size={size} color="#fff" fill="#fff" />;
      default: return null;
    }
  };

  const getSuitBgColor = (suit: string) => {
    switch (suit) {
      case 'heart':
      case 'diamond': return C.primary;
      case 'star': return C.tertiary;
      case 'club':
      case 'spade': return C.onSurface;
      default: return C.secondary;
    }
  };

  const getSuitRingColor = (suit: string) => {
    switch (suit) {
      case 'heart':
      case 'diamond': return `${C.primary}33`; // Faint primary ring 
      default: return `${C.onSurface}1A`; // Faint grey ring
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.maxWidthContainer}>
          
          {/* ── Section Title ── */}
          <View style={styles.pageHeader}>
            <Text style={styles.eyebrow}>YOUR INBOX</Text>
            <Text style={styles.pageTitle}>Chats</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={C.primary} size="large" style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* ── Friends List (Inner Circle) ── */}
              <View style={styles.friendsSection}>
                <View style={styles.friendsHeader}>
                  <Text style={styles.friendsTitle}>Inner Circle</Text>
                  <TouchableOpacity style={styles.addFriendBtn} activeOpacity={0.7}>
                    <PlusCircle size={14} color={C.primary} />
                    <Text style={styles.addFriendText}>ADD FRIEND</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.friendsScroll}
                >
                  {/* Invite Slot */}
                  <TouchableOpacity style={styles.friendCol} activeOpacity={0.7}>
                    <View style={styles.inviteRing}>
                      <View style={styles.inviteInner}>
                        <UserPlus size={24} color={C.secondary} />
                      </View>
                    </View>
                    <Text style={[styles.friendName, { color: C.secondary }]}>Invite</Text>
                  </TouchableOpacity>

                  {/* Active Friends */}
                  {activeFriends.map(friend => (
                    <TouchableOpacity key={friend.id} style={styles.friendCol} activeOpacity={0.8}>
                      <View style={[styles.friendRing, { borderColor: getSuitRingColor(friend.suit) }]}>
                        <Image source={{ uri: friend.avatar_url }} style={styles.friendAvatar} />
                        {friend.suit !== 'club' && (
                          <View style={[styles.friendSuitBadge, { backgroundColor: getSuitBgColor(friend.suit) }]}>
                            {getSuitIcon(friend.suit, 8)}
                          </View>
                        )}
                      </View>
                      <Text style={[styles.friendName, friend.suit === 'club' ? { color: C.secondary } : {}]}>
                        {friend.first_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* ── Chat List (Active Tables) ── */}
              <View style={styles.chatsSection}>
                <Text style={styles.chatsTitle}>Active Tables</Text>

                <View style={styles.chatList}>
                  {chatRooms.map((chat) => {
                    const isInactive = chat.type === 'inactive';
                    const isGroup = chat.type === 'group';

                    return (
                      <TouchableOpacity
                        key={chat.id}
                        style={[
                          styles.chatCard,
                          isInactive && { backgroundColor: C.surfaceContainer, shadowOpacity: 0, borderWidth: 0 }
                        ]}
                        activeOpacity={0.85}
                      >
                        {/* Avatar Cell */}
                        <View style={styles.chatAvatarRel}>
                          {isGroup ? (
                            <View style={styles.groupAvatarGrid}>
                              <Image source={{ uri: MOCK_FRIENDS[0].avatar_url }} style={styles.groupAvatarImg} />
                              <Image source={{ uri: MOCK_FRIENDS[1].avatar_url }} style={styles.groupAvatarImg} />
                              <Image source={{ uri: MOCK_FRIENDS[2].avatar_url }} style={styles.groupAvatarImg} />
                              <View style={styles.groupAvatarCount}>
                                <Text style={styles.groupAvatarCountText}>+8</Text>
                              </View>
                            </View>
                          ) : (
                            <Image
                              source={{ uri: chat.avatar_url }}
                              style={[styles.chatAvatarImg, isInactive && { opacity: 0.5 }]}
                            />
                          )}

                          {/* Top-Left Overlap Badge */}
                          <View style={[styles.chatSuitBadge, { backgroundColor: isInactive ? C.secondary : getSuitBgColor(chat.suit) }]}>
                            {getSuitIcon(chat.suit, 12)}
                          </View>
                        </View>

                        {/* Content Cell */}
                        <View style={styles.chatContent}>
                          <View style={styles.chatHeaderRow}>
                            <Text style={[styles.chatName, isInactive && { color: C.secondary }]}>{chat.name}</Text>
                            <Text style={styles.chatTime}>{chat.timeAgo}</Text>
                          </View>
                          <Text
                            style={[
                              styles.chatMessage,
                              isGroup && !isInactive ? { fontFamily: F.bodyBold, color: C.onSurface } : {}
                            ]}
                            numberOfLines={1}
                          >
                            {chat.lastMessage}
                          </Text>
                        </View>

                        {/* Unread Indicator */}
                        {chat.unread && (
                          <View style={styles.unreadDotBox}>
                            <View style={styles.unreadDot} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

            </>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surfaceContainer },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 16, alignItems: 'center' },
  maxWidthContainer: { width: '100%', maxWidth: 672, flex: 1 },

  // Header Title
  pageHeader: { marginBottom: 32, gap: 4 },
  eyebrow: {
    fontFamily: F.labelExtra,
    fontSize: 10,
    letterSpacing: 2,
    color: C.tertiary, // Olive Gold matching screenshot
    textTransform: 'uppercase',
  },
  pageTitle: {
    fontFamily: F.headline,
    fontSize: 48,
    color: C.onSurface,
    letterSpacing: -1,
  },

  // Friends Section (Inner Circle)
  friendsSection: { marginBottom: 40 },
  friendsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  friendsTitle: {
    fontFamily: F.headline,
    fontSize: 24,
    color: C.onSurface,
    fontStyle: 'italic',
  },
  addFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addFriendText: {
    fontFamily: F.labelExtra,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.primary,
  },

  friendsScroll: {
    gap: 20, 
    paddingRight: 16,
  },
  friendCol: {
    alignItems: 'center',
    gap: 12,
    width: 68,
  },
  inviteRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: C.outlineVariant,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  inviteInner: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    backgroundColor: C.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendRing: {
    position: 'relative',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  friendAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    backgroundColor: C.surfaceContainerHighest,
  },
  friendSuitBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.surfaceContainer, // Matches background to cut out
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendName: {
    fontFamily: F.label,
    fontSize: 11,
    color: C.onSurface,
  },

  // Chats Section (Active Tables)
  chatsSection: { marginBottom: 12 },
  chatsTitle: {
    fontFamily: F.headline,
    fontSize: 24,
    color: C.onSurface,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  chatList: { gap: 12 },
  
  chatCard: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  chatAvatarRel: {
    position: 'relative',
    width: 56,
    height: 56,
  },
  chatAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: C.surfaceContainerHighest,
  },
  groupAvatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: C.surfaceContainer,
    gap: 2,
  },
  groupAvatarImg: {
    width: 27,
    height: 27,
  },
  groupAvatarCount: {
    width: 27,
    height: 27,
    backgroundColor: C.tertiaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarCountText: {
    fontFamily: F.labelExtra,
    fontSize: 10,
    color: C.onTertiaryContainer,
  },
  chatSuitBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.surfaceContainerLowest, // Matches card bg to cut out
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chatContent: { flex: 1, paddingRight: 4 },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  chatName: {
    fontFamily: F.headline,
    fontSize: 22,
    color: C.onSurface,
    lineHeight: 24,
  },
  chatTime: {
    fontFamily: F.labelExtra,
    fontSize: 9,
    color: C.secondary,
  },
  chatMessage: {
    fontFamily: F.body,
    fontSize: 13,
    color: C.secondary,
  },
  unreadDotBox: {
    paddingLeft: 8,
    justifyContent: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },
});
