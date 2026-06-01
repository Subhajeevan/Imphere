-- ============================================================================
-- IMPHERE - Submission Verification Trigger
-- Automates awarding standing/credits, updating counts, and creating transactions/notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_submission_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_standing_reward INTEGER;
  v_ic_reward INTEGER;
  v_new_standing INTEGER;
  v_new_ic INTEGER;
  v_challenge_title TEXT;
BEGIN
  -- Only trigger when status changes to 'verified'
  IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
    -- Get rewards and title from the challenge
    SELECT standing_reward, ic_reward, title
    INTO v_standing_reward, v_ic_reward, v_challenge_title
    FROM challenges
    WHERE id = NEW.challenge_id;

    -- Set the awarded fields and timestamp on the submission itself
    NEW.standing_awarded := COALESCE(v_standing_reward, 0);
    NEW.ic_awarded := COALESCE(v_ic_reward, 0);
    NEW.verified_at := COALESCE(NEW.verified_at, NOW());

    -- Update the user's profile with the rewards
    UPDATE profiles
    SET 
      standing = standing + NEW.standing_awarded,
      impact_credits = impact_credits + NEW.ic_awarded
    WHERE id = NEW.user_id
    RETURNING standing, impact_credits INTO v_new_standing, v_new_ic;

    -- Increment completion_count on the challenge
    UPDATE challenges
    SET completion_count = completion_count + 1
    WHERE id = NEW.challenge_id;

    -- Create transaction log for standing_earned
    IF NEW.standing_awarded > 0 THEN
      INSERT INTO transactions (
        user_id,
        type,
        amount,
        balance_after,
        description,
        related_challenge_id,
        related_submission_id
      )
      VALUES (
        NEW.user_id,
        'standing_earned'::transaction_type,
        NEW.standing_awarded,
        COALESCE(v_new_standing, NEW.standing_awarded),
        'Completed challenge: ' || v_challenge_title,
        NEW.challenge_id,
        NEW.id
      );
    END IF;

    -- Create transaction log for ic_earned
    IF NEW.ic_awarded > 0 THEN
      INSERT INTO transactions (
        user_id,
        type,
        amount,
        balance_after,
        description,
        related_challenge_id,
        related_submission_id
      )
      VALUES (
        NEW.user_id,
        'ic_earned'::transaction_type,
        NEW.ic_awarded,
        COALESCE(v_new_ic, NEW.ic_awarded),
        'Earned Impact Credits from challenge: ' || v_challenge_title,
        NEW.challenge_id,
        NEW.id
      );
    END IF;

    -- Create a notification for the user
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      related_challenge_id
    )
    VALUES (
      NEW.user_id,
      'challenge_verified'::notification_type,
      'Challenge Proof Verified!',
      'Your proof for "' || v_challenge_title || '" has been verified. You earned ' || NEW.standing_awarded || ' Standing and ' || NEW.ic_awarded || ' Impact Credits!',
      NEW.challenge_id
    );

  END IF;
  RETURN NEW;
END;
$$;

-- Trigger: Execute BEFORE UPDATE on challenge_submissions to set awarded fields and apply side effects
CREATE TRIGGER on_submission_verification
  BEFORE UPDATE OF status ON challenge_submissions
  FOR EACH ROW EXECUTE FUNCTION handle_submission_verification();
