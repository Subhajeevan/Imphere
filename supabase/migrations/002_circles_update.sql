-- ============================================================================
-- MIGRATION 002: Impact Circles — category column + circle_messages table
-- Run this in the Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================================

-- ============================================================================
-- 1. Add category column to impact_circles
-- ============================================================================

ALTER TABLE impact_circles
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'community'
    CONSTRAINT impact_circles_category_check
      CHECK (category IN ('environment', 'health', 'community'));

-- Backfill the three seed circles by name heuristic
UPDATE impact_circles SET category = 'environment'
  WHERE name ILIKE '%green%' OR name ILIKE '%environment%' OR name ILIKE '%nature%';

UPDATE impact_circles SET category = 'health'
  WHERE name ILIKE '%blood%' OR name ILIKE '%health%' OR name ILIKE '%medical%';

-- All remaining circles default to 'community' from the column default

-- ============================================================================
-- 2. Create circle_messages table
-- ============================================================================

CREATE TABLE IF NOT EXISTS circle_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id  UUID        NOT NULL REFERENCES impact_circles(id) ON DELETE CASCADE,
  author_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT circle_messages_content_length
    CHECK (char_length(content) BETWEEN 1 AND 1000)
);

-- Compound index: every chat fetch is WHERE circle_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_circle_messages_circle_time
  ON circle_messages(circle_id, created_at DESC);

-- ============================================================================
-- 3. Row Level Security for circle_messages
-- ============================================================================

ALTER TABLE circle_messages ENABLE ROW LEVEL SECURITY;

-- Only circle members can read messages
CREATE POLICY "Circle members can read messages"
  ON circle_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM impact_circle_members
      WHERE circle_id = circle_messages.circle_id
        AND user_id   = auth.uid()
    )
  );

-- Members can send messages; author_id must match the authenticated user
CREATE POLICY "Circle members can send messages"
  ON circle_messages FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM impact_circle_members
      WHERE circle_id = circle_messages.circle_id
        AND user_id   = auth.uid()
    )
  );

-- Authors (and principals/stewards) can delete messages
CREATE POLICY "Authors and circle leaders can delete messages"
  ON circle_messages FOR DELETE
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM impact_circle_members
      WHERE circle_id = circle_messages.circle_id
        AND user_id   = auth.uid()
        AND role IN ('principal', 'steward')
    )
  );

-- ============================================================================
-- 4. Enable Supabase Realtime for circle_messages
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE circle_messages;

-- ============================================================================
-- DONE
-- ============================================================================
