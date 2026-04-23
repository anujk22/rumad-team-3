-- ============================================================
-- Full House — Supabase Schema (Complete Rewrite)
-- Rutgers-exclusive social platform
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables to ensure a clean slate
DROP TABLE IF EXISTS public.event_attendees CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.meetup_attendees CASCADE;
DROP TABLE IF EXISTS public.meetups CASCADE;
DROP TABLE IF EXISTS public.live_queue CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chat_participants CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;
DROP TABLE IF EXISTS public.swipes CASCADE;
DROP TABLE IF EXISTS public.user_tags CASCADE;
DROP TABLE IF EXISTS public.tags CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================
-- RUTGERS EMAIL ENFORCEMENT
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_rutgers_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.email NOT LIKE '%@rutgers.edu'
     AND NEW.email NOT LIKE '%@scarletmail.rutgers.edu' THEN
    RAISE EXCEPTION 'Only Rutgers email addresses are allowed to register.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rutgers_email_gate ON auth.users;
CREATE TRIGGER rutgers_email_gate
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rutgers_email();

-- ============================================================
-- 1. TABLE DEFINITIONS
-- ============================================================

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT,
  first_name TEXT,
  age INTEGER,
  gender TEXT,                    
  gender_preference TEXT,         
  pronouns TEXT,                  
  height_inches INTEGER,          
  ethnicity TEXT,                 
  bio TEXT,                       
  religion TEXT,               
  avatar_urls TEXT[] DEFAULT '{}',
  academic_year TEXT,             
  major TEXT,
  is_commuter BOOLEAN DEFAULT false,
  is_international BOOLEAN DEFAULT false,
  dating_enabled BOOLEAN DEFAULT false,
  friends_enabled BOOLEAN DEFAULT true,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'event_manager', 'admin')),
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- TAGS
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  emoji TEXT DEFAULT ''
);

INSERT INTO public.tags (name, emoji) VALUES
  ('Gym', '💪'), ('Boba', '🧋'), ('Cooking', '🍳'), ('Anime', '🎌'),
  ('Nightlife', '🌃'), ('Tech', '💻'), ('Sports', '⚽'), ('Photography', '📸'),
  ('Music', '🎵'), ('Gaming', '🎮'), ('Art', '🎨'), ('Reading', '📚'),
  ('Travel', '✈️'), ('Movies', '🎬'), ('Fashion', '👗'), ('Hiking', '🥾'),
  ('Dance', '💃'), ('Volunteering', '🤝'), ('Startups', '🚀'), ('Podcasts', '🎙️'),
  ('Thrifting', '🛍️'), ('Coffee', '☕'), ('Yoga', '🧘'), ('Board Games', '🎲'),
  ('Cars', '🏎️')
ON CONFLICT (name) DO NOTHING;

-- USER TAGS
CREATE TABLE IF NOT EXISTS public.user_tags (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, tag_id)
);

-- SWIPES
CREATE TABLE IF NOT EXISTS public.swipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  swiper_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  swiped_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_right_swipe BOOLEAN NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('dating', 'friends')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(swiper_id, swiped_id, mode)
);

-- CHATS
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('direct', 'spontaneous', 'study_crew')),
  name TEXT,                
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- CHAT PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.chat_participants (
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (chat_id, user_id)
);

-- MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  media_url TEXT,             
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- LIVE QUEUE
CREATE TABLE IF NOT EXISTS public.live_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- MEETUPS
CREATE TABLE IF NOT EXISTS public.meetups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  meetup_time TIMESTAMPTZ NOT NULL,
  max_capacity INTEGER DEFAULT 20,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- MEETUP ATTENDEES
CREATE TABLE IF NOT EXISTS public.meetup_attendees (
  meetup_id UUID REFERENCES public.meetups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (meetup_id, user_id)
);

-- EVENTS
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  event_time TIMESTAMPTZ NOT NULL,
  poster_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- EVENT ATTENDEES
CREATE TABLE IF NOT EXISTS public.event_attendees (
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (event_id, user_id)
);

-- ============================================================
-- 2. ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') );

-- ============================================================
-- 2. SECURE ACCOUNT DELETION
-- ============================================================

-- Function to allow a user to delete their own account from auth.users
-- This must be SECURITY DEFINER to have permission to delete from auth.users
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Data in public.profiles will be deleted automatically due to ON DELETE CASCADE
  -- but we can explicitly delete it if we want to be sure or if we didn't have cascade.
  -- The most important part is deleting from auth.users.
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tags are viewable by everyone" ON public.tags FOR SELECT USING (true);

-- User Tags
ALTER TABLE public.user_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User tags are viewable by authenticated users" ON public.user_tags FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert their own tags" ON public.user_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tags" ON public.user_tags FOR DELETE USING (auth.uid() = user_id);

-- Swipes
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own swipes" ON public.swipes FOR SELECT USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);
CREATE POLICY "Users can insert their own swipes" ON public.swipes FOR INSERT WITH CHECK (auth.uid() = swiper_id);

-- ============================================================
-- 3. CHAT PARTICIPANT SECURITY DEFINER
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_chat_participant(check_chat_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_id = check_chat_id AND user_id = check_user_id
  );
$$;

-- Chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view chats they participate in or study crews" ON public.chats FOR SELECT USING (
  type = 'study_crew' OR public.is_chat_participant(id, auth.uid())
);
CREATE POLICY "Authenticated users can create chats" ON public.chats FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Chat Participants
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view participants in their chats or study crews" ON public.chat_participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chats WHERE id = chat_id AND type = 'study_crew') OR
  public.is_chat_participant(chat_id, auth.uid())
);
CREATE POLICY "Authenticated users can join chats" ON public.chat_participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages in their chats" ON public.messages FOR SELECT USING (
  public.is_chat_participant(chat_id, auth.uid())
);
CREATE POLICY "Users can insert messages in their chats" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND public.is_chat_participant(chat_id, auth.uid())
);

-- Live Queue
ALTER TABLE public.live_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Queue is viewable by authenticated users" ON public.live_queue FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can join queue" ON public.live_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave queue" ON public.live_queue FOR DELETE USING (auth.uid() = user_id);

-- Meetups
ALTER TABLE public.meetups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Meetups are viewable by authenticated users" ON public.meetups FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create meetups" ON public.meetups FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their meetups" ON public.meetups FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete their meetups" ON public.meetups FOR DELETE USING (auth.uid() = creator_id);

-- Meetup Attendees
ALTER TABLE public.meetup_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attendees are viewable by authenticated users" ON public.meetup_attendees FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can join meetups" ON public.meetup_attendees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave meetups" ON public.meetup_attendees FOR DELETE USING (auth.uid() = user_id);

-- Events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events are viewable by authenticated users" ON public.events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins and event managers can create events" ON public.events FOR INSERT WITH CHECK ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'event_manager')) );
CREATE POLICY "Creators can update their events" ON public.events FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete their events" ON public.events FOR DELETE USING (auth.uid() = creator_id);

-- Event Attendees
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Event attendees are viewable by authenticated users" ON public.event_attendees FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can RSVP to events" ON public.event_attendees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can un-RSVP from events" ON public.event_attendees FOR DELETE USING (auth.uid() = user_id);
