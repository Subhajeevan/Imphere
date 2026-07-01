-- ============================================================================
-- Migration 008: Direct Message (DM) chat enhancements
-- Run in Supabase SQL Editor after 001–007.  Fully idempotent.
--
-- Brings the rich chat features to 1-on-1 DMs (mirrors 007 for circles):
--   • message_type (text / image / document / location)
--   • reply_to_id           — threaded replies
--   • attachment / location  (jsonb)
-- Plus a direct_message_reactions table. Membership is checked via a
-- SECURITY DEFINER helper so RLS never recurses.
--
-- Tables/columns are created BEFORE the helper function, because LANGUAGE sql
-- bodies are validated at creation time.
-- ============================================================================

-- ── 1. Extend direct_messages ────────────────────────────────────────────────

ALTER TABLE direct_messages ALTER COLUMN content DROP NOT NULL;

-- Drop the original inline length CHECK from 005 (auto-named), whatever it's called.
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c
  FROM pg_constraint
  WHERE conrelid = 'public.direct_messages'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%char_length(content)%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE direct_messages DROP CONSTRAINT %I', c);
  END IF;
END $$;

ALTER TABLE direct_messages DROP CONSTRAINT IF EXISTS direct_messages_content_len;
ALTER TABLE direct_messages
  ADD CONSTRAINT direct_messages_content_len
  CHECK (content IS NULL OR char_length(content) <= 2000);

ALTER TABLE direct_messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS reply_to_id  UUID REFERENCES direct_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attachment   JSONB,
  ADD COLUMN IF NOT EXISTS location     JSONB;

ALTER TABLE direct_messages DROP CONSTRAINT IF EXISTS direct_messages_type_check;
ALTER TABLE direct_messages
  ADD CONSTRAINT direct_messages_type_check
  CHECK (message_type IN ('text','image','document','location','system'));

CREATE INDEX IF NOT EXISTS idx_direct_messages_reply ON direct_messages(reply_to_id);

-- ── 2. Reactions ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS direct_message_reactions (
  message_id UUID        NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles(id)        ON DELETE CASCADE,
  emoji      TEXT        NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 16),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_dm_reactions_message ON direct_message_reactions(message_id);

-- ── 3. Participant helper (created AFTER the tables) ─────────────────────────

-- True when p_user_id is a participant in the conversation that owns p_message_id.
CREATE OR REPLACE FUNCTION public.is_participant_of_dm(p_message_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.direct_messages dm
    JOIN public.conversation_participants cp ON cp.conversation_id = dm.conversation_id
    WHERE dm.id = p_message_id AND cp.user_id = p_user_id
  );
$$;

-- ── 4. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE direct_message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view dm reactions" ON direct_message_reactions;
CREATE POLICY "Participants can view dm reactions" ON direct_message_reactions FOR SELECT
USING (public.is_participant_of_dm(message_id, auth.uid()));

DROP POLICY IF EXISTS "Participants can add dm reactions" ON direct_message_reactions;
CREATE POLICY "Participants can add dm reactions" ON direct_message_reactions FOR INSERT
WITH CHECK (user_id = auth.uid() AND public.is_participant_of_dm(message_id, auth.uid()));

DROP POLICY IF EXISTS "Users can remove own dm reactions" ON direct_message_reactions;
CREATE POLICY "Users can remove own dm reactions" ON direct_message_reactions FOR DELETE
USING (user_id = auth.uid());

-- ── 5. Realtime ──────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'direct_message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE direct_message_reactions;
  END IF;
END $$;
