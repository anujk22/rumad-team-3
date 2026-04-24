import { supabase } from '@/lib/supabase';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';

type QueueStatus = 'idle' | 'queued' | 'forming' | 'ready';

type QueueContextType = {
  status: QueueStatus;
  queueCount: number;
  chatId: string | null;
  joinQueue: () => Promise<void>;
  leaveQueue: () => Promise<void>;
  clearReady: () => void;
};

const QueueContext = createContext<QueueContextType>({
  status: 'idle',
  queueCount: 0,
  chatId: null,
  joinQueue: async () => { },
  leaveQueue: async () => { },
  clearReady: () => { },
});

export function useQueue() {
  return useContext(QueueContext);
}

const MIN_GROUP_SIZE = 3;
const MAX_GROUP_SIZE = 6;

export function QueueProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<QueueStatus>('idle');
  const [queueCount, setQueueCount] = useState(0);
  const [chatId, setChatId] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  // Fetch current queue count
  const fetchQueueCount = useCallback(async () => {
    const { count, error } = await supabase
      .from('live_queue')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error fetching queue count:', error.message);
    } else {
      setQueueCount(count || 0);
    }
  }, []);

  // Check if we're already in queue or have a ready table
  useEffect(() => {
    if (!user) return;

    const checkStatus = async () => {
      // 1. Check for recent spontaneous chats first
      const { data: part } = await supabase
        .from('chat_participants')
        .select('chat_id, joined_at, chats(type, created_at)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (part && (part.chats as any)?.type === 'spontaneous') {
        const createdAt = new Date((part.chats as any).created_at).getTime();
        const now = new Date().getTime();
        // If created in the last 5 minutes, show as ready
        if (now - createdAt < 5 * 60 * 1000) {
          setChatId(part.chat_id);
          setStatus('ready');
          await fetchQueueCount();
          return;
        }
      }

      // 2. Otherwise check if we're in queue
      const { data: qData } = await supabase
        .from('live_queue')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (qData) {
        setStatus('queued');
      } else {
        setStatus('idle');
      }
      await fetchQueueCount();
    };

    checkStatus();
  }, [user, fetchQueueCount]);

  // Subscribe to queue changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('live-queue-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_queue' },
        async () => {
          await fetchQueueCount();
          await tryFormGroup();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchQueueCount]);

  // Subscribe to chat participant additions (for when someone else forms a table)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-chat-additions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_participants',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload: any) => {
          const { data: chat } = await supabase
            .from('chats')
            .select('id, type')
            .eq('id', payload.new.chat_id)
            .single();

          if (chat?.type === 'spontaneous') {
            setChatId(chat.id);
            setStatus('ready');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const tryFormGroup = useCallback(async () => {
    if (!user || status === 'ready' || status === 'forming') return;

    const { data: queueEntries } = await supabase
      .from('live_queue')
      .select('user_id')
      .order('joined_at', { ascending: true })
      .limit(MAX_GROUP_SIZE);

    if (!queueEntries || queueEntries.length < MIN_GROUP_SIZE) return;

    // Check if current user is in this batch
    const isInBatch = queueEntries.some(e => e.user_id === user.id);
    if (!isInBatch) return;

    // Only the first person in the batch creates the chat
    if (queueEntries[0].user_id !== user.id) return;

    try {
      setStatus('forming');

      // Create spontaneous chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          type: 'spontaneous',
          name: `Table #${Math.floor(Math.random() * 9000) + 1000}`,
          metadata: { formed_at: new Date().toISOString() },
        })
        .select()
        .single();

      if (chatError || !chat) {
        setStatus('queued');
        return;
      }

      // Add all batch members as participants
      const participants = queueEntries.map(e => ({
        chat_id: chat.id,
        user_id: e.user_id,
      }));

      await supabase.from('chat_participants').insert(participants);

      // Remove all batch members from queue
      const userIds = queueEntries.map(e => e.user_id);
      await supabase.from('live_queue').delete().in('user_id', userIds);

      // Send a system message
      await supabase.from('messages').insert({
        chat_id: chat.id,
        sender_id: user.id,
        content: '🃏 A new table has been formed! Say hello to your group.',
      });

      setChatId(chat.id);
      setStatus('ready');
    } catch (err) {
      console.error('Error forming group:', err);
      setStatus('queued');
    }
  }, [user, status]);

  const joinQueue = useCallback(async () => {
    if (!user || status !== 'idle') return;

    const { error } = await supabase
      .from('live_queue')
      .upsert({ user_id: user.id });

    if (!error) {
      setStatus('queued');
      await fetchQueueCount();
    }
  }, [user, status, fetchQueueCount]);

  const leaveQueue = useCallback(async () => {
    if (!user) return;

    await supabase.from('live_queue').delete().eq('user_id', user.id);
    setStatus('idle');
    setChatId(null);
    await fetchQueueCount();
  }, [user, fetchQueueCount]);

  const clearReady = useCallback(() => {
    setStatus('idle');
    setChatId(null);
  }, []);

  return (
    <QueueContext.Provider value={{ status, queueCount, chatId, joinQueue, leaveQueue, clearReady }}>
      {children}
    </QueueContext.Provider>
  );
}
