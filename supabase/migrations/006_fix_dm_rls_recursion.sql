-- ============================================================================
-- Migration 006: Fix infinite recursion in conversation_participants RLS
--
-- The policies in 005 referenced conversation_participants *inside* the policy
-- on conversation_participants itself, so Postgres recursed forever:
--   "infinite recursion detected in policy for relation conversation_participants"
--
-- Fix: do the membership check inside a SECURITY DEFINER function, which runs
-- as the table owner and therefore BYPASSES RLS — breaking the cycle. All three
-- policies then call that function instead of self-querying.
--
-- Safe to run multiple times (CREATE OR REPLACE + DROP IF EXISTS).
-- ============================================================================

-- ── 1. Membership check that bypasses RLS ────────────────────────────────────

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

-- ── 2. Drop the recursive policies created by 005 ─────────────────────────────

DROP POLICY IF EXISTS "Participants can view conversations" ON conversations;
DROP POLICY IF EXISTS "Participants can view participants"  ON conversation_participants;
DROP POLICY IF EXISTS "Participants can view messages"      ON direct_messages;

-- ── 3. Recreate them using the helper (no self-reference → no recursion) ──────

CREATE POLICY "Participants can view conversations" ON conversations FOR SELECT
USING (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY "Participants can view participants" ON conversation_participants FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Participants can view messages" ON direct_messages FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()));
