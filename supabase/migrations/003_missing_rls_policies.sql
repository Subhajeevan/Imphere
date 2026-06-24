-- ============================================================================
-- Migration 003: Add missing RLS policies for circle membership & transactions
-- ============================================================================

-- Allow authenticated users to join circles
CREATE POLICY "Users can join circles"
  ON impact_circle_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to leave circles (principals are blocked at API level)
CREATE POLICY "Users can leave circles"
  ON impact_circle_members FOR DELETE
  USING (auth.uid() = user_id);

-- Allow server-side inserts for transaction logging (service role bypasses RLS)
-- No user-facing INSERT policy on transactions — logged exclusively via API
-- with admin client to prevent tampered amounts.

-- Allow authenticated users to view their own transactions (already exists in 001,
-- but adding here for completeness if the instance is freshly seeded from scratch)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'transactions' AND policyname = 'Users can view own transactions'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view own transactions"
      ON transactions FOR SELECT
      USING (auth.uid() = user_id)';
  END IF;
END;
$$;
