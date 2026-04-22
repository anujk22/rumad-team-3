-- ============================================================
-- Full House — Supabase Schema
-- Rutgers-exclusive social platform
-- ============================================================

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 🔒 RUTGERS EMAIL ENFORCEMENT
-- DB-level guard: only @rutgers.edu emails may sign up.
-- This complements the app-level check in the auth screens.
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_rutgers_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.email NOT LIKE '%@rutgers.edu' THEN
    RAISE EXCEPTION 'Only @rutgers.edu email addresses are allowed to register.';
  END IF;
  RETURN NEW;
END;
$$;

-- Fire before every new auth user insert
DROP TRIGGER IF EXISTS rutgers_email_gate ON auth.users;
CREATE TRIGGER rutgers_email_gate
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rutgers_email();

-- ============================================================
-- Profiles table: Extended user attributes
-- ============================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  first_name TEXT,
  age INTEGER,
  avatar_urls TEXT[] DEFAULT '{}',
  academic_year TEXT,   -- 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Grad'
  major TEXT,
  is_commuter BOOLEAN DEFAULT false,
  is_international BOOLEAN DEFAULT false,
  app_mode TEXT DEFAULT 'friend' CHECK (app_mode IN ('friend', 'dating')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Tags
CREATE TABLE public.tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Initial seed for Tags
INSERT INTO public.tags (name) VALUES 
('Gym'), ('Boba'), ('Cooking'), ('Anime'), ('Nightlife'), 
('Tech'), ('Sports'), ('Photography'), ('Music'), ('Gaming')
ON CONFLICT (name) DO NOTHING;

-- User Tags Junction Table
CREATE TABLE public.user_tags (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, tag_id)
);

-- Row Level Security for User Tags
ALTER TABLE public.user_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User tags are viewable by everyone." ON public.user_tags FOR SELECT USING (true);
CREATE POLICY "Users can manage their own tags" ON public.user_tags FOR ALL USING (auth.uid() = user_id);

-- Swipes
CREATE TABLE public.swipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  swiper_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  swiped_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_right_swipe BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(swiper_id, swiped_id)
);

-- Chats
CREATE TYPE chat_type AS ENUM ('direct', 'study_crew', 'spontaneous');
CREATE TABLE public.chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type chat_type NOT NULL,
  metadata JSONB, -- storing course code or spontaneous group name
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Chat Participants
CREATE TABLE public.chat_participants (
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (chat_id, user_id)
);

-- Messages
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Meetups
CREATE TYPE meetup_tier AS ENUM ('core', 'casual');
CREATE TABLE public.meetups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  meetup_time TIMESTAMP WITH TIME ZONE NOT NULL,
  tier meetup_tier NOT NULL,
  max_capacity INTEGER NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Meetup Attendees
CREATE TABLE public.meetup_attendees (
  meetup_id UUID REFERENCES public.meetups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'rsvped', -- 'rsvped', 'verified'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (meetup_id, user_id)
);

-- Events
CREATE TABLE public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  event_time TIMESTAMP WITH TIME ZONE NOT NULL,
  poster_url TEXT,
  is_verified_org_event BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Storage configuration for profile avatars and event posters
-- Insert storage buckets if not running through migrations (manual setup required in Dashboard usually, but keeping as a note)
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
-- insert into storage.buckets (id, name, public) values ('posters', 'posters', true);
