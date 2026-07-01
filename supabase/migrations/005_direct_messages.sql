-- ============================================================================
-- Migration 005: Direct Messages (DMs)
-- Run in Supabase SQL Editor after 001–004
-- ============================================================================

-- ── 1. conversations ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  last_message     TEXT,
  last_message_at  TIMESTAMPTZ,
  last_sender_id   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. conversation_participants ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id)      ON DELETE CASCADE,
  last_read_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user
  ON conversation_participants(user_id);

-- ── 3. direct_messages ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS direct_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES profiles(id)      ON DELETE CASCADE,
  content         TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_conv
  ON direct_messages(conversation_id, created_at);

-- ── 4. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE conversations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages           ENABLE ROW LEVEL SECURITY;

-- Membership check runs as SECURITY DEFINER so it BYPASSES RLS. This is what
-- prevents infinite recursion: a policy on conversation_participants must not
-- query conversation_participants directly, or Postgres recurses forever.
CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  p_conversation_id UUID,
  p_user_id         UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
  );
$$;

-- conversations: visible only to participants
DROP POLICY IF EXISTS "Participants can view conversations" ON conversations;
CREATE POLICY "Participants can view conversations" ON conversations FOR SELECT
USING (public.is_conversation_participant(id, auth.uid()));

-- conversation_participants: visible only if you are a participant
DROP POLICY IF EXISTS "Participants can view participants" ON conversation_participants;
CREATE POLICY "Participants can view participants" ON conversation_participants FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()));

-- direct_messages: readable by conversation participants (needed for Realtime)
DROP POLICY IF EXISTS "Participants can view messages" ON direct_messages;
CREATE POLICY "Participants can view messages" ON direct_messages FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()));

-- ── 5. Enable Realtime ───────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'direct_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
  END IF;
END $$;
