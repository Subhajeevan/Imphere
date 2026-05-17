-- ============================================================================
-- IMPHERE - Initial Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable pg_trgm for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

-- User badge tiers
CREATE TYPE badge_tier AS ENUM ('Citizen', 'Bronze', 'Silver', 'Gold');

-- User roles
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Onboarding status
CREATE TYPE onboarding_status AS ENUM ('incomplete', 'active');

-- Challenge types
CREATE TYPE challenge_type AS ENUM ('static', 'proclamation');

-- Challenge status
CREATE TYPE challenge_status AS ENUM ('pending', 'active', 'completed', 'expired');

-- Submission verification status
CREATE TYPE submission_status AS ENUM ('pending', 'verified', 'rejected', 'flagged');

-- Post moderation status
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected');

-- Media types
CREATE TYPE media_type AS ENUM ('image', 'video');

-- Notification types
CREATE TYPE notification_type AS ENUM (
  'vouch', 'comment', 'follow', 'mention',
  'challenge_verified', 'challenge_rejected',
  'proclamation_threshold', 'ic_credited',
  'circle_invite', 'circle_task', 'system'
);

-- Transaction types
CREATE TYPE transaction_type AS ENUM (
  'standing_earned', 'standing_spent',
  'ic_earned', 'ic_spent',
  'voucher_redeemed'
);

-- Impact circle member roles
CREATE TYPE circle_role AS ENUM ('principal', 'steward', 'member');

-- ============================================================================
-- PROFILES TABLE (Extends auth.users)
-- ============================================================================

CREATE TABLE profiles (
  -- References Supabase auth.users
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,

  -- Role & Status
  role user_role DEFAULT 'user',
  onboarding_status onboarding_status DEFAULT 'incomplete',
  is_banned BOOLEAN DEFAULT FALSE,

  -- Native Pin (Hometown) - Set once, changeable yearly
  -- We store the name + coordinates, no complex localities table needed
  native_pin_name TEXT, -- e.g., "Mumbai, Maharashtra, India"
  native_pin_location GEOGRAPHY(POINT, 4326),
  native_pin_set_at TIMESTAMPTZ,

  -- Active location (current GPS)
  active_location GEOGRAPHY(POINT, 4326),
  active_location_updated_at TIMESTAMPTZ,

  -- Reputation & Currency
  standing INTEGER DEFAULT 0 CHECK (standing >= 0),
  impact_credits INTEGER DEFAULT 0 CHECK (impact_credits >= 0),

  -- Badge (computed from standing, but stored for query performance)
  badge badge_tier DEFAULT 'Citizen',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_standing ON profiles(standing DESC);
CREATE INDEX idx_profiles_badge ON profiles(badge);
CREATE INDEX idx_profiles_native_pin_location ON profiles USING GIST(native_pin_location);
CREATE INDEX idx_profiles_active_location ON profiles USING GIST(active_location);
CREATE INDEX idx_profiles_display_name_trgm ON profiles USING GIN(display_name gin_trgm_ops);

-- ============================================================================
-- FUNCTION: Auto-create profile on signup
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$;

-- Trigger: Create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- FUNCTION: Update badge based on standing
-- ============================================================================

CREATE OR REPLACE FUNCTION update_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.badge := CASE
    WHEN NEW.standing >= 5000 THEN 'Gold'::badge_tier
    WHEN NEW.standing >= 2000 THEN 'Silver'::badge_tier
    WHEN NEW.standing >= 500 THEN 'Bronze'::badge_tier
    ELSE 'Citizen'::badge_tier
  END;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- Trigger: Update badge when standing changes
CREATE TRIGGER on_standing_change
  BEFORE UPDATE OF standing ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_badge();

-- ============================================================================
-- FOLLOWS TABLE (Believers/Believing)
-- ============================================================================

CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- ============================================================================
-- CHALLENGE CATEGORIES (Welfare Tracks)
-- ============================================================================

CREATE TABLE challenge_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Lucide icon name
  color TEXT, -- Hex color
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CHALLENGES
-- ============================================================================

CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Type & Category
  type challenge_type NOT NULL,
  category_id UUID REFERENCES challenge_categories(id),

  -- Content
  title TEXT NOT NULL,
  description TEXT,

  -- Creator (null for static/admin-created challenges)
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Location (for proclamations and location-specific challenges)
  location GEOGRAPHY(POINT, 4326),
  locality_name TEXT, -- e.g., "Hyderabad, Telangana"

  -- For proclamations: voting threshold
  power_threshold INTEGER DEFAULT 500,
  current_power INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ, -- 14 days from creation for proclamations

  -- Status
  status challenge_status DEFAULT 'active',

  -- Rewards
  standing_reward INTEGER DEFAULT 50,
  ic_reward INTEGER DEFAULT 20,

  -- Stats (denormalized for performance)
  participant_count INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_challenges_type ON challenges(type);
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenges_category ON challenges(category_id);
CREATE INDEX idx_challenges_location ON challenges USING GIST(location);
CREATE INDEX idx_challenges_created_by ON challenges(created_by);
CREATE INDEX idx_challenges_expires_at ON challenges(expires_at) WHERE type = 'proclamation';

-- ============================================================================
-- CHALLENGE BACKERS (For Proclamations)
-- ============================================================================

CREATE TABLE challenge_backers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  standing_contributed INTEGER NOT NULL CHECK (standing_contributed > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(challenge_id, user_id)
);

CREATE INDEX idx_backers_challenge ON challenge_backers(challenge_id);
CREATE INDEX idx_backers_user ON challenge_backers(user_id);

-- ============================================================================
-- CHALLENGE SUBMISSIONS (Proof of Action)
-- ============================================================================

CREATE TABLE challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Media proof
  media_url TEXT NOT NULL,
  media_type media_type DEFAULT 'image',

  -- Geolocation verification
  claimed_location GEOGRAPHY(POINT, 4326) NOT NULL,
  exif_location GEOGRAPHY(POINT, 4326),
  location_verified BOOLEAN DEFAULT FALSE,
  location_distance_meters FLOAT,

  -- Timestamps from verification
  claimed_timestamp TIMESTAMPTZ DEFAULT NOW(),
  exif_timestamp TIMESTAMPTZ,

  -- Verification
  status submission_status DEFAULT 'pending',
  rejection_reason TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),

  -- Rewards (recorded when verified)
  standing_awarded INTEGER DEFAULT 0,
  ic_awarded INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submissions_challenge ON challenge_submissions(challenge_id);
CREATE INDEX idx_submissions_user ON challenge_submissions(user_id);
CREATE INDEX idx_submissions_status ON challenge_submissions(status);
CREATE INDEX idx_submissions_pending ON challenge_submissions(status) WHERE status = 'pending';

-- ============================================================================
-- POSTS
-- ============================================================================

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Content
  caption TEXT,
  media_url TEXT NOT NULL,
  media_type media_type DEFAULT 'image',

  -- Location
  location GEOGRAPHY(POINT, 4326),
  locality_name TEXT,

  -- Challenge link (if this is a challenge proof post)
  is_challenge_proof BOOLEAN DEFAULT FALSE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
  submission_id UUID REFERENCES challenge_submissions(id) ON DELETE SET NULL,

  -- Moderation
  is_approved BOOLEAN DEFAULT TRUE,
  moderation_status moderation_status DEFAULT 'approved',

  -- Counts (denormalized)
  vouch_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_location ON posts USING GIST(location);
CREATE INDEX idx_posts_challenge ON posts(challenge_id) WHERE challenge_id IS NOT NULL;
CREATE INDEX idx_posts_approved ON posts(is_approved, created_at DESC) WHERE is_approved = TRUE;

-- ============================================================================
-- VOUCHES (Likes)
-- ============================================================================

CREATE TABLE vouches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, post_id)
);

CREATE INDEX idx_vouches_post ON vouches(post_id);
CREATE INDEX idx_vouches_user ON vouches(user_id);

-- Function to update vouch count
CREATE OR REPLACE FUNCTION update_post_vouch_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET vouch_count = vouch_count + 1, updated_at = NOW() WHERE id = NEW.post_id;
    -- Award 1 standing to post author
    UPDATE profiles SET standing = standing + 1
    WHERE id = (SELECT author_id FROM posts WHERE id = NEW.post_id);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET vouch_count = vouch_count - 1, updated_at = NOW() WHERE id = OLD.post_id;
    UPDATE profiles SET standing = GREATEST(standing - 1, 0)
    WHERE id = (SELECT author_id FROM posts WHERE id = OLD.post_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_vouch_change
  AFTER INSERT OR DELETE ON vouches
  FOR EACH ROW EXECUTE FUNCTION update_post_vouch_count();

-- ============================================================================
-- COMMENTS
-- ============================================================================

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,

  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id, created_at);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL;

-- Function to update comment count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1, updated_at = NOW() WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = comment_count - 1, updated_at = NOW() WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- ============================================================================
-- SAVES (Bookmarks)
-- ============================================================================

CREATE TABLE saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, post_id)
);

CREATE INDEX idx_saves_user ON saves(user_id, created_at DESC);

-- ============================================================================
-- IMPACT CIRCLES (Community Groups)
-- ============================================================================

CREATE TABLE impact_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,

  -- Leadership
  principal_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Location
  locality_name TEXT,
  location GEOGRAPHY(POINT, 4326),

  -- Stats
  member_count INTEGER DEFAULT 1,
  eminence_score INTEGER DEFAULT 0, -- Sum of all members' standing

  -- Settings
  min_badge_required badge_tier DEFAULT 'Bronze',
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_circles_principal ON impact_circles(principal_id);
CREATE INDEX idx_circles_eminence ON impact_circles(eminence_score DESC);
CREATE INDEX idx_circles_location ON impact_circles USING GIST(location);

-- ============================================================================
-- IMPACT CIRCLE MEMBERS
-- ============================================================================

CREATE TABLE impact_circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES impact_circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  role circle_role DEFAULT 'member',
  ready_to_serve BOOLEAN DEFAULT FALSE,

  joined_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(circle_id, user_id)
);

CREATE INDEX idx_circle_members_circle ON impact_circle_members(circle_id);
CREATE INDEX idx_circle_members_user ON impact_circle_members(user_id);
CREATE INDEX idx_circle_members_ready ON impact_circle_members(circle_id, ready_to_serve)
  WHERE ready_to_serve = TRUE;

-- Function to update circle member count and eminence
CREATE OR REPLACE FUNCTION update_circle_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE impact_circles SET
      member_count = member_count + 1,
      eminence_score = eminence_score + COALESCE((SELECT standing FROM profiles WHERE id = NEW.user_id), 0),
      updated_at = NOW()
    WHERE id = NEW.circle_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE impact_circles SET
      member_count = GREATEST(member_count - 1, 0),
      eminence_score = GREATEST(eminence_score - COALESCE((SELECT standing FROM profiles WHERE id = OLD.user_id), 0), 0),
      updated_at = NOW()
    WHERE id = OLD.circle_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_circle_member_change
  AFTER INSERT OR DELETE ON impact_circle_members
  FOR EACH ROW EXECUTE FUNCTION update_circle_stats();

-- ============================================================================
-- VOUCHERS
-- ============================================================================

CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Display info
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,

  -- Value
  ic_cost INTEGER NOT NULL CHECK (ic_cost > 0),
  value_description TEXT, -- e.g., "₹100 Store Credit"
  merchant_name TEXT,

  -- The actual code (encrypted at application level)
  encrypted_code TEXT NOT NULL,

  -- Redemption
  is_redeemed BOOLEAN DEFAULT FALSE,
  redeemed_by UUID REFERENCES profiles(id),
  redeemed_at TIMESTAMPTZ,

  -- Validity
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vouchers_available ON vouchers(is_active, is_redeemed, ic_cost)
  WHERE is_active = TRUE AND is_redeemed = FALSE;
CREATE INDEX idx_vouchers_redeemed_by ON vouchers(redeemed_by) WHERE redeemed_by IS NOT NULL;

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,

  -- Related entities (nullable)
  related_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  related_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  related_challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
  related_circle_id UUID REFERENCES impact_circles(id) ON DELETE SET NULL,

  is_read BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = FALSE;

-- ============================================================================
-- TRANSACTIONS (Audit Log)
-- ============================================================================

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  type transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,

  description TEXT,

  -- Related entities
  related_challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
  related_voucher_id UUID REFERENCES vouchers(id) ON DELETE SET NULL,
  related_submission_id UUID REFERENCES challenge_submissions(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_backers ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouches ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Anyone can view profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- FOLLOWS POLICIES
-- ============================================================================

-- Anyone can view follows
CREATE POLICY "Follows are viewable by everyone"
  ON follows FOR SELECT
  USING (true);

-- Users can follow/unfollow
CREATE POLICY "Users can create follows"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete own follows"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================================================
-- CHALLENGE CATEGORIES POLICIES
-- ============================================================================

-- Anyone can view categories
CREATE POLICY "Categories are viewable by everyone"
  ON challenge_categories FOR SELECT
  USING (true);

-- Only admins can modify (handled at API level)

-- ============================================================================
-- CHALLENGES POLICIES
-- ============================================================================

-- Anyone can view active challenges
CREATE POLICY "Active challenges are viewable by everyone"
  ON challenges FOR SELECT
  USING (status IN ('active', 'completed'));

-- Authenticated users can create proclamations
CREATE POLICY "Users can create proclamations"
  ON challenges FOR INSERT
  WITH CHECK (auth.uid() = created_by AND type = 'proclamation');

-- ============================================================================
-- CHALLENGE BACKERS POLICIES
-- ============================================================================

-- Anyone can view backers
CREATE POLICY "Backers are viewable by everyone"
  ON challenge_backers FOR SELECT
  USING (true);

-- Users can back challenges
CREATE POLICY "Users can back challenges"
  ON challenge_backers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- CHALLENGE SUBMISSIONS POLICIES
-- ============================================================================

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions"
  ON challenge_submissions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all submissions (handled at API level with service role)

-- Users can create submissions
CREATE POLICY "Users can create submissions"
  ON challenge_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- POSTS POLICIES
-- ============================================================================

-- Anyone can view approved posts
CREATE POLICY "Approved posts are viewable by everyone"
  ON posts FOR SELECT
  USING (is_approved = true);

-- Users can view their own posts regardless of approval
CREATE POLICY "Users can view own posts"
  ON posts FOR SELECT
  USING (auth.uid() = author_id);

-- Users can create posts
CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================================================
-- VOUCHES POLICIES
-- ============================================================================

-- Anyone can view vouches
CREATE POLICY "Vouches are viewable by everyone"
  ON vouches FOR SELECT
  USING (true);

-- Users can vouch
CREATE POLICY "Users can create vouches"
  ON vouches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their vouches
CREATE POLICY "Users can delete own vouches"
  ON vouches FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS POLICIES
-- ============================================================================

-- Anyone can view comments
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT
  USING (true);

-- Users can create comments
CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = author_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================================================
-- SAVES POLICIES
-- ============================================================================

-- Users can only view their own saves
CREATE POLICY "Users can view own saves"
  ON saves FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create saves
CREATE POLICY "Users can create saves"
  ON saves FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their saves
CREATE POLICY "Users can delete own saves"
  ON saves FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- IMPACT CIRCLES POLICIES
-- ============================================================================

-- Anyone can view active circles
CREATE POLICY "Active circles are viewable by everyone"
  ON impact_circles FOR SELECT
  USING (is_active = true);

-- Users can create circles (badge check at API level)
CREATE POLICY "Users can create circles"
  ON impact_circles FOR INSERT
  WITH CHECK (auth.uid() = principal_id);

-- Principals can update their circles
CREATE POLICY "Principals can update own circles"
  ON impact_circles FOR UPDATE
  USING (auth.uid() = principal_id);

-- ============================================================================
-- IMPACT CIRCLE MEMBERS POLICIES
-- ============================================================================

-- Anyone can view circle members
CREATE POLICY "Circle members are viewable by everyone"
  ON impact_circle_members FOR SELECT
  USING (true);

-- Members can update their own membership (ready_to_serve toggle)
CREATE POLICY "Members can update own membership"
  ON impact_circle_members FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- VOUCHERS POLICIES
-- ============================================================================

-- Anyone can view available vouchers (not the encrypted codes)
CREATE POLICY "Available vouchers are viewable"
  ON vouchers FOR SELECT
  USING (is_active = true);

-- Users can view their redeemed vouchers
CREATE POLICY "Users can view own redeemed vouchers"
  ON vouchers FOR SELECT
  USING (auth.uid() = redeemed_by);

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRANSACTIONS POLICIES
-- ============================================================================

-- Users can only view their own transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- SEED DATA: Challenge Categories
-- ============================================================================

INSERT INTO challenge_categories (name, description, icon, color, display_order) VALUES
  ('Fitness', 'Physical activities like running, yoga, and outdoor exercises', 'activity', '#22C55E', 1),
  ('Blood Donation', 'Donate blood at certified centers and save lives', 'heart', '#EF4444', 2),
  ('Tree Plantation', 'Plant and nurture trees in your locality', 'tree-pine', '#16A34A', 3),
  ('Food Donation', 'Donate food to those in need', 'utensils', '#F97316', 4),
  ('Cleanliness', 'Community cleanup and sanitation drives', 'sparkles', '#3B82F6', 5),
  ('Education', 'Teaching, tutoring, and educational support', 'book-open', '#8B5CF6', 6),
  ('Infrastructure', 'Report and help fix local infrastructure issues', 'wrench', '#6B7280', 7),
  ('Healthcare', 'Health camps, awareness drives, and medical support', 'stethoscope', '#EC4899', 8);

-- ============================================================================
-- SEED DATA: Sample Static Challenges
-- ============================================================================

INSERT INTO challenges (type, category_id, title, description, standing_reward, ic_reward, status)
SELECT
  'static',
  id,
  'Complete a 5km Run',
  'Run 5 kilometers and capture proof at a public location',
  50,
  20,
  'active'
FROM challenge_categories WHERE name = 'Fitness';

INSERT INTO challenges (type, category_id, title, description, standing_reward, ic_reward, status)
SELECT
  'static',
  id,
  'Donate Blood',
  'Donate blood at a certified blood bank and submit your certificate',
  100,
  50,
  'active'
FROM challenge_categories WHERE name = 'Blood Donation';

INSERT INTO challenges (type, category_id, title, description, standing_reward, ic_reward, status)
SELECT
  'static',
  id,
  'Plant a Sapling',
  'Plant a tree sapling in a public area and capture the moment',
  75,
  30,
  'active'
FROM challenge_categories WHERE name = 'Tree Plantation';

INSERT INTO challenges (type, category_id, title, description, standing_reward, ic_reward, status)
SELECT
  'static',
  id,
  'Water 5 Public Trees',
  'Water at least 5 trees in public spaces',
  30,
  15,
  'active'
FROM challenge_categories WHERE name = 'Tree Plantation';

INSERT INTO challenges (type, category_id, title, description, standing_reward, ic_reward, status)
SELECT
  'static',
  id,
  'Donate Food to 10 People',
  'Prepare or purchase food and distribute to those in need',
  80,
  40,
  'active'
FROM challenge_categories WHERE name = 'Food Donation';

INSERT INTO challenges (type, category_id, title, description, standing_reward, ic_reward, status)
SELECT
  'static',
  id,
  'Community Cleanup Drive',
  'Participate in or organize a local cleanup drive',
  60,
  25,
  'active'
FROM challenge_categories WHERE name = 'Cleanliness';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user can change native pin (once per year)
CREATE OR REPLACE FUNCTION can_change_native_pin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  last_set TIMESTAMPTZ;
BEGIN
  SELECT native_pin_set_at INTO last_set FROM profiles WHERE id = user_id;

  IF last_set IS NULL THEN
    RETURN TRUE;
  END IF;

  RETURN (NOW() - last_set) > INTERVAL '1 year';
END;
$$;

-- Function to calculate distance between two points (in meters)
CREATE OR REPLACE FUNCTION distance_meters(
  lat1 FLOAT, lon1 FLOAT,
  lat2 FLOAT, lon2 FLOAT
)
RETURNS FLOAT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ST_Distance(
    ST_MakePoint(lon1, lat1)::geography,
    ST_MakePoint(lon2, lat2)::geography
  );
$$;

-- Function to verify submission location (within 50m)
CREATE OR REPLACE FUNCTION verify_submission_location(
  claimed_lat FLOAT, claimed_lon FLOAT,
  exif_lat FLOAT, exif_lon FLOAT
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT distance_meters(claimed_lat, claimed_lon, exif_lat, exif_lon) <= 50;
$$;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Leaderboard view
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  id,
  display_name,
  avatar_url,
  standing,
  badge,
  native_pin_name,
  RANK() OVER (ORDER BY standing DESC) as rank
FROM profiles
WHERE onboarding_status = 'active' AND is_banned = FALSE
ORDER BY standing DESC;

-- Circle leaderboard view
CREATE OR REPLACE VIEW circle_leaderboard AS
SELECT
  id,
  name,
  avatar_url,
  locality_name,
  member_count,
  eminence_score,
  RANK() OVER (ORDER BY eminence_score DESC) as rank
FROM impact_circles
WHERE is_active = TRUE
ORDER BY eminence_score DESC;

-- ============================================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable realtime for posts (for feed updates)
ALTER PUBLICATION supabase_realtime ADD TABLE posts;

-- Enable realtime for challenges (for proclamation voting)
ALTER PUBLICATION supabase_realtime ADD TABLE challenges;

-- ============================================================================
-- DONE!
-- ============================================================================
-- Run this entire file in Supabase SQL Editor to set up the database.
-- After running, configure Google OAuth in Supabase Auth settings:
-- Dashboard > Authentication > Providers > Google
