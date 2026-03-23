-- SUPABASE INITIAL SCHEMA
-- Run this in the Supabase SQL Editor

-- 1. PROFILES
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text,
  display_name text,
  avatar_url text,
  public_key text,
  created_at timestamptz DEFAULT now()
);

-- 2. CONVERSATIONS
CREATE TABLE public.conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('direct', 'group')),
  name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- 3. CONVERSATION MEMBERS
CREATE TABLE public.conversation_members (
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- 4. MESSAGES
CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) NOT NULL,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  type text DEFAULT 'text',
  reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  reactions jsonb DEFAULT '{}',
  auto_delete_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 5. MEDIA (Storage Refs)
CREATE TABLE public.media (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size bigint,
  created_at timestamptz DEFAULT now()
);

-- 6. CALENDAR
CREATE TABLE public.calendar_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  color text,
  creator_id uuid REFERENCES public.profiles(id) NOT NULL,
  attendees jsonb DEFAULT '[]'
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;


-- POLICIES

-- Profiles: Anyone can read profiles. Users can update their own.
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Conversations: Users can see conversations they are a member of
CREATE POLICY "Users can see their conversations" ON public.conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert conversations" ON public.conversations FOR INSERT WITH CHECK (true);

-- Conversation Members: Users can see members of their conversations
CREATE POLICY "Users can see members of their conversations" ON public.conversation_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = conversation_members.conversation_id AND cm.user_id = auth.uid())
);
CREATE POLICY "Users can insert members" ON public.conversation_members FOR INSERT WITH CHECK (true);

-- Messages: Users can see and insert messages in their conversations
CREATE POLICY "Users can see messages in their conversations" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert messages" ON public.messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update message reactions" ON public.messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);


-- HELPER RPC FUNCTIONS

-- Get direct conversation between two users
CREATE OR REPLACE FUNCTION get_direct_conversation(user1_id uuid, user2_id uuid)
RETURNS TABLE (id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id
  FROM public.conversations c
  JOIN public.conversation_members cm1 ON c.id = cm1.conversation_id
  JOIN public.conversation_members cm2 ON c.id = cm2.conversation_id
  WHERE c.type = 'direct'
    AND cm1.user_id = user1_id
    AND cm2.user_id = user2_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
