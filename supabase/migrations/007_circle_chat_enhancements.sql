-- ============================================================================
-- Migration 007: Circle Chat enhancements (foundation)
-- Run in Supabase SQL Editor after 001–006.
--
-- Adds, on top of the existing circle_messages table:
--   • message_type discriminator (text / image / document / location / poll /
--     announcement / system) so one table powers every message kind
--   • reply_to_id           — threaded replies
--   • attachment (jsonb)     — image/document metadata (Cloudinary)
--   • location  (jsonb)      — shared coordinates
--   • is_pinned / pinned_*   — admin-pinned messages
--   • is_announcement        — highlighted admin announcements
-- Plus new tables: circle_message_reactions, circle_polls, circle_poll_votes.
--
-- All membership checks go through SECURITY DEFINER helpers so RLS never
-- recurses (same approach as migration 006 for DMs). Fully idempotent.
--
-- NOTE: tables are created BEFORE the helper functions, because LANGUAGE sql
-- function bodies are validated at creation time and reference those tables.
-- ============================================================================

-- ── 1. Extend circle_messages ────────────────────────────────────────────────

-- Relax the content constraint: attachment/location/poll messages may have no text.
ALTER TABLE circle_messages ALTER COLUMN content DROP NOT NULL;
ALTER TABLE circle_messages DROP CONSTRAINT IF EXISTS circle_messages_content_length;
ALTER TABLE circle_messages
  ADD CONSTRAINT circle_messages_content_length
  CHECK (content IS NULL OR char_length(content) <= 2000);

ALTER TABLE circle_messages
  ADD COLUMN IF NOT EXISTS message_type    TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS reply_to_id     UUID REFERENCES circle_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attachment      JSONB,
  ADD COLUMN IF NOT EXISTS location        JSONB,
  ADD COLUMN IF NOT EXISTS is_pinned       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_announcement BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE circle_messages DROP CONSTRAINT IF EXISTS circle_messages_type_check;
ALTER TABLE circle_messages
  ADD CONSTRAINT circle_messages_type_check
  CHECK (message_type IN ('text','image','document','location','poll','announcement','system'));

CREATE INDEX IF NOT EXISTS idx_circle_messages_reply       ON circle_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_circle_messages_pinned      ON circle_messages(circle_id) WHERE is_pinned = true;

-- ── 2. Reactions ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS circle_message_reactions (
  message_id UUID        NOT NULL REFERENCES circle_messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles(id)        ON DELETE CASCADE,
  emoji      TEXT        NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 16),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_msg_reactions_message ON circle_message_reactions(message_id);

-- ── 3. Polls ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS circle_polls (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id     UUID        NOT NULL REFERENCES circle_messages(id) ON DELETE CASCADE,
  question       TEXT        NOT NULL CHECK (char_length(question) BETWEEN 1 AND 300),
  options        JSONB       NOT NULL, -- [{ id: string, text: string }]
  allow_multiple BOOLEAN     NOT NULL DEFAULT false,
  closes_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circle_polls_message ON circle_polls(message_id);

CREATE TABLE IF NOT EXISTS circle_poll_votes (
  poll_id    UUID        NOT NULL REFERENCES circle_polls(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles(id)     ON DELETE CASCADE,
  option_id  TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (poll_id, user_id, option_id)
);

CREATE INDEX IF NOT EXISTS idx_circle_poll_votes_poll ON circle_poll_votes(poll_id);

-- ── 4. Membership / leadership helpers (bypass RLS, no recursion) ─────────────
-- Created after the tables above so their SQL bodies validate cleanly.

CREATE OR REPLACE FUNCTION public.is_circle_member(p_circle_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.impact_circle_members
    WHERE circle_id = p_circle_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_circle_leader(p_circle_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.impact_circle_members
    WHERE circle_id = p_circle_id
      AND user_id = p_user_id
      AND role IN ('principal', 'steward')
  );
$$;

-- True when p_user_id is a member of the circle that owns p_message_id.
CREATE OR REPLACE FUNCTION public.is_member_of_message_circle(p_message_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.circle_messages m
    JOIN public.impact_circle_members cm
      ON cm.circle_id = m.circle_id
    WHERE m.id = p_message_id AND cm.user_id = p_user_id
  );
$$;

-- True when p_user_id is a member of the circle that owns the poll's message.
CREATE OR REPLACE FUNCTION public.is_member_of_poll_circle(p_poll_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.circle_polls p
    JOIN public.circle_messages m ON m.id = p.message_id
    JOIN public.impact_circle_members cm ON cm.circle_id = m.circle_id
    WHERE p.id = p_poll_id AND cm.user_id = p_user_id
  );
$$;

-- ── 5. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE circle_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_polls             ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_poll_votes        ENABLE ROW LEVEL SECURITY;

-- Reactions: circle members can read; users manage their own reactions.
DROP POLICY IF EXISTS "Members can view reactions" ON circle_message_reactions;
CREATE POLICY "Members can view reactions" ON circle_message_reactions FOR SELECT
USING (public.is_member_of_message_circle(message_id, auth.uid()));

DROP POLICY IF EXISTS "Members can add reactions" ON circle_message_reactions;
CREATE POLICY "Members can add reactions" ON circle_message_reactions FOR INSERT
WITH CHECK (user_id = auth.uid() AND public.is_member_of_message_circle(message_id, auth.uid()));

DROP POLICY IF EXISTS "Users can remove own reactions" ON circle_message_reactions;
CREATE POLICY "Users can remove own reactions" ON circle_message_reactions FOR DELETE
USING (user_id = auth.uid());

-- Polls: circle members can read; members can create a poll on their own message.
DROP POLICY IF EXISTS "Members can view polls" ON circle_polls;
CREATE POLICY "Members can view polls" ON circle_polls FOR SELECT
USING (public.is_member_of_message_circle(message_id, auth.uid()));

DROP POLICY IF EXISTS "Members can create polls" ON circle_polls;
CREATE POLICY "Members can create polls" ON circle_polls FOR INSERT
WITH CHECK (public.is_member_of_message_circle(message_id, auth.uid()));

-- Poll votes: members can read tallies; users manage their own votes.
DROP POLICY IF EXISTS "Members can view votes" ON circle_poll_votes;
CREATE POLICY "Members can view votes" ON circle_poll_votes FOR SELECT
USING (public.is_member_of_poll_circle(poll_id, auth.uid()));

DROP POLICY IF EXISTS "Members can cast votes" ON circle_poll_votes;
CREATE POLICY "Members can cast votes" ON circle_poll_votes FOR INSERT
WITH CHECK (user_id = auth.uid() AND public.is_member_of_poll_circle(poll_id, auth.uid()));

DROP POLICY IF EXISTS "Users can change own votes" ON circle_poll_votes;
CREATE POLICY "Users can change own votes" ON circle_poll_votes FOR DELETE
USING (user_id = auth.uid());

-- circle_messages: allow circle leaders to UPDATE (needed for pin + moderation).
DROP POLICY IF EXISTS "Circle leaders can update messages" ON circle_messages;
CREATE POLICY "Circle leaders can update messages" ON circle_messages FOR UPDATE
USING (public.is_circle_leader(circle_id, auth.uid()))
WITH CHECK (public.is_circle_leader(circle_id, auth.uid()));

-- Harden the INSERT path (replaces the permissive policy from migration 002):
-- members may send messages, but only leaders may post announcements. This is
-- defense-in-depth — the app posts announcements via a leader-gated API, but a
-- raw client insert must not be able to forge an announcement.
DROP POLICY IF EXISTS "Circle members can send messages" ON circle_messages;
CREATE POLICY "Circle members can send messages" ON circle_messages FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND public.is_circle_member(circle_id, auth.uid())
  AND (
    (is_announcement = false AND message_type <> 'announcement')
    OR public.is_circle_leader(circle_id, auth.uid())
  )
);

-- ── 6. Realtime ──────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'circle_message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE circle_message_reactions;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'circle_poll_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE circle_poll_votes;
  END IF;
END $$;
