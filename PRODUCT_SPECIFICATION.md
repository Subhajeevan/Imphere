# IMPHERE - Complete Product Specification

## Overview

**IMPHERE** is a civic engagement and social networking platform commissioned by a local public representative (MLA). Citizens complete real-world civic tasks, earn reputation (Standing) and spendable credits (Impact Credits), and collectively escalate local issues into funded challenges.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+ (App Router, Server Components) |
| Database | Supabase (PostgreSQL + PostGIS) |
| Auth | Supabase Auth (Google OAuth) |
| Real-time | Supabase Realtime |
| Cache | Upstash Redis |
| Media | Cloudinary |
| Moderation | AWS Rekognition (future) |

---

## Design System

### Colors
```
Primary Background:    #FFFFFF (Pure White)
Secondary Background:  #F9F9F9 (Off-white)
Primary Accent:        #D4AF37 (Polished Gold)
Secondary Accent:      #C5A059 (Muted Gold)
Border:                #E5E5E5 (Light Gray)
Text Primary:          #1A1A1A (Near Black)
Text Secondary:        #6B7280 (Gray)
Error:                 #DC2626 (Red)
Success:               #16A34A (Green)

Badge Colors:
- Citizen:             #6B7280 (Gray)
- Bronze:              #CD7F32
- Silver:              #C0C0C0
- Gold:                #D4AF37
```

### Typography
```
Headings:    Playfair Display (Serif)
Body:        Inter (Sans-serif)
```

### Badge Thresholds
```
Citizen:     0 - 499 Standing
Bronze:      500 - 1,999 Standing
Silver:      2,000 - 4,999 Standing
Gold:        5,000+ Standing
```

---

## Database Schema (PostgreSQL)

### 1. users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),

  -- Location pins
  native_pin_id UUID REFERENCES localities(id),
  native_pin_set_at TIMESTAMPTZ,
  active_location GEOGRAPHY(POINT, 4326),

  -- Reputation & Currency
  standing INTEGER DEFAULT 0 CHECK (standing >= 0),
  impact_credits INTEGER DEFAULT 0 CHECK (impact_credits >= 0),

  -- Computed badge (or use generated column)
  badge VARCHAR(20) DEFAULT 'Citizen' CHECK (badge IN ('Citizen', 'Bronze', 'Silver', 'Gold')),

  -- Status
  onboarding_status VARCHAR(20) DEFAULT 'incomplete' CHECK (onboarding_status IN ('incomplete', 'active')),
  is_banned BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for geospatial queries
CREATE INDEX idx_users_active_location ON users USING GIST(active_location);
CREATE INDEX idx_users_standing ON users(standing DESC);
CREATE INDEX idx_users_native_pin ON users(native_pin_id);
```

### 2. localities (Indian States/Districts)
```sql
CREATE TABLE localities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) CHECK (type IN ('state', 'district', 'city', 'village')),
  parent_id UUID REFERENCES localities(id),
  boundary GEOGRAPHY(POLYGON, 4326),
  center_point GEOGRAPHY(POINT, 4326),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_localities_parent ON localities(parent_id);
CREATE INDEX idx_localities_boundary ON localities USING GIST(boundary);
```

### 3. follows (Believers/Believing)
```sql
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
```

### 4. posts
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Content
  caption TEXT,
  media_url TEXT NOT NULL,
  media_type VARCHAR(20) CHECK (media_type IN ('image', 'video')),

  -- Location
  location GEOGRAPHY(POINT, 4326),
  locality_id UUID REFERENCES localities(id),

  -- Metadata
  is_challenge_proof BOOLEAN DEFAULT FALSE,
  challenge_id UUID REFERENCES challenges(id),

  -- Moderation
  is_approved BOOLEAN DEFAULT TRUE,
  moderation_status VARCHAR(20) DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),

  -- Counts (denormalized for performance)
  vouch_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_location ON posts USING GIST(location);
CREATE INDEX idx_posts_locality ON posts(locality_id);
CREATE INDEX idx_posts_challenge ON posts(challenge_id);
```

### 5. vouches (Likes)
```sql
CREATE TABLE vouches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, post_id)
);

CREATE INDEX idx_vouches_post ON vouches(post_id);
CREATE INDEX idx_vouches_user ON vouches(user_id);
```

### 6. comments
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,

  content TEXT NOT NULL CHECK (char_length(content) <= 500),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
```

### 7. saves (Bookmarks)
```sql
CREATE TABLE saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, post_id)
);

CREATE INDEX idx_saves_user ON saves(user_id);
```

### 8. challenge_categories (Static Welfare Tracks)
```sql
CREATE TABLE challenge_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7),

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data: Fitness, Blood Donation, Tree Plantation, Food Donation, Infrastructure
```

### 9. challenges
```sql
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Type: static (welfare track) or proclamation (user-raised)
  type VARCHAR(20) NOT NULL CHECK (type IN ('static', 'proclamation')),
  category_id UUID REFERENCES challenge_categories(id),

  -- Content
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Creator (null for static challenges)
  created_by UUID REFERENCES users(id),

  -- Location
  location GEOGRAPHY(POINT, 4326),
  locality_id UUID REFERENCES localities(id),

  -- For proclamations
  power_threshold INTEGER DEFAULT 500,
  current_power INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'expired')),

  -- Rewards
  standing_reward INTEGER DEFAULT 50,
  ic_reward INTEGER DEFAULT 20,

  -- Counts
  participant_count INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_challenges_type ON challenges(type);
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenges_locality ON challenges(locality_id);
CREATE INDEX idx_challenges_location ON challenges USING GIST(location);
CREATE INDEX idx_challenges_category ON challenges(category_id);
```

### 10. challenge_backers (For Proclamations)
```sql
CREATE TABLE challenge_backers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  standing_contributed INTEGER NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(challenge_id, user_id)
);

CREATE INDEX idx_backers_challenge ON challenge_backers(challenge_id);
CREATE INDEX idx_backers_user ON challenge_backers(user_id);
```

### 11. challenge_submissions (Proof of Action)
```sql
CREATE TABLE challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Media proof
  media_url TEXT NOT NULL,
  media_type VARCHAR(20) CHECK (media_type IN ('image', 'video')),

  -- Geolocation verification
  claimed_location GEOGRAPHY(POINT, 4326) NOT NULL,
  exif_location GEOGRAPHY(POINT, 4326),
  location_verified BOOLEAN DEFAULT FALSE,
  location_distance_meters FLOAT,

  -- Timestamps from EXIF
  claimed_timestamp TIMESTAMPTZ,
  exif_timestamp TIMESTAMPTZ,

  -- Verification status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'flagged')),
  rejection_reason TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),

  -- Rewards granted
  standing_awarded INTEGER DEFAULT 0,
  ic_awarded INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submissions_challenge ON challenge_submissions(challenge_id);
CREATE INDEX idx_submissions_user ON challenge_submissions(user_id);
CREATE INDEX idx_submissions_status ON challenge_submissions(status);
```

### 12. impact_circles (Community Groups)
```sql
CREATE TABLE impact_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(100) NOT NULL,
  description TEXT,
  avatar_url TEXT,

  -- Leadership
  principal_id UUID REFERENCES users(id) NOT NULL,

  -- Location
  locality_id UUID REFERENCES localities(id),

  -- Stats
  member_count INTEGER DEFAULT 1,
  eminence_score INTEGER DEFAULT 0,

  -- Settings
  min_badge_required VARCHAR(20) DEFAULT 'Bronze',
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_circles_locality ON impact_circles(locality_id);
CREATE INDEX idx_circles_eminence ON impact_circles(eminence_score DESC);
```

### 13. impact_circle_members
```sql
CREATE TABLE impact_circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES impact_circles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('principal', 'steward', 'member')),
  ready_to_serve BOOLEAN DEFAULT FALSE,

  joined_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(circle_id, user_id)
);

CREATE INDEX idx_circle_members_circle ON impact_circle_members(circle_id);
CREATE INDEX idx_circle_members_user ON impact_circle_members(user_id);
CREATE INDEX idx_circle_members_ready ON impact_circle_members(circle_id, ready_to_serve) WHERE ready_to_serve = TRUE;
```

### 14. vouchers
```sql
CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Voucher details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,

  -- Value
  ic_cost INTEGER NOT NULL CHECK (ic_cost > 0),
  value_description VARCHAR(100), -- e.g., "₹100 Store Credit"

  -- The actual code (encrypted)
  encrypted_code TEXT NOT NULL,

  -- Redemption
  is_redeemed BOOLEAN DEFAULT FALSE,
  redeemed_by UUID REFERENCES users(id),
  redeemed_at TIMESTAMPTZ,

  -- Validity
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vouchers_active ON vouchers(is_active, is_redeemed) WHERE is_active = TRUE AND is_redeemed = FALSE;
CREATE INDEX idx_vouchers_redeemed_by ON vouchers(redeemed_by);
```

### 15. notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL CHECK (type IN (
    'vouch', 'comment', 'follow', 'mention',
    'challenge_verified', 'challenge_rejected',
    'proclamation_threshold', 'ic_credited',
    'circle_invite', 'circle_task', 'system'
  )),

  title VARCHAR(255) NOT NULL,
  message TEXT,

  -- Related entities
  related_user_id UUID REFERENCES users(id),
  related_post_id UUID REFERENCES posts(id),
  related_challenge_id UUID REFERENCES challenges(id),
  related_circle_id UUID REFERENCES impact_circles(id),

  -- Status
  is_read BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
```

### 16. transactions (Audit Log)
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL CHECK (type IN (
    'standing_earned', 'standing_spent',
    'ic_earned', 'ic_spent',
    'voucher_redeemed'
  )),

  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,

  description TEXT,
  related_challenge_id UUID REFERENCES challenges(id),
  related_voucher_id UUID REFERENCES vouchers(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id, created_at DESC);
```

---

## UI Screens

### 1. Authentication & Onboarding (`/auth`)

#### Desktop Layout
- **Left Panel (50%):** Matte black background, gold IMPHERE emblem, tagline "Build Your Standing. Resolve the Future."
- **Right Panel (50%):** White background with auth components

#### Mobile Layout
- Vertical stack: Gold logo at top, auth components below

#### Components
```
AuthPage
├── RoleSelector (segmented control: Citizen Portal | Admin Console)
├── GoogleSignInButton (white bg, gold border, Google icon)
└── OnboardingModal (first-time users)
    ├── DualPinExplainer (info text)
    ├── LocalitySearchDropdown (searchable, Indian states/districts)
    └── ConfirmButton
```

#### States
- `unauthenticated` → Show sign-in
- `authenticated + incomplete` → Show onboarding modal (blocking)
- `authenticated + active` → Redirect to home

---

### 2. Home Page - Civic Feed (`/`)

#### Navigation
- **Desktop:** Fixed left sidebar with gold "IMPHERE" wordmark, nav links
- **Mobile:** Top bar (logo + notification bell), bottom tab bar

#### Components
```
HomePage
├── DesktopSidebar / MobileNav
├── FeedSwitcher (3 tabs)
│   ├── ForYouTab (global moderated feed)
│   ├── BelievingTab (following feed, chronological)
│   └── ChallengesTab (completed civic actions)
└── PostFeed
    └── PostCard (repeating)
        ├── PostHeader
        │   ├── Avatar (with badge ring)
        │   ├── DisplayName
        │   └── LocationTag
        ├── MediaFrame (image/video)
        └── InteractionToolbar
            ├── VouchButton (chevron icon)
            ├── CommentButton
            ├── ShareButton
            └── SaveButton
```

#### Feed APIs
- `GET /api/feed/for-you` - Global moderated posts
- `GET /api/feed/believing` - Posts from followed users
- `GET /api/feed/challenges` - Challenge completion posts

---

### 3. Search & Explore (`/explore`)

#### Components
```
ExplorePage
├── SearchBar (off-white bg, gold magnifying glass)
├── TrendingSection
│   └── TrendingCard (image + gradient + hashtag overlay)
└── SuggestedCatalysts
    └── CatalystCard
        ├── Avatar
        ├── DisplayName
        ├── StandingScore
        └── BelieveButton (gold)
```

#### APIs
- `GET /api/search?q={query}` - Search users and hashtags
- `GET /api/explore/trending` - Trending content
- `GET /api/explore/suggested` - Suggested users to follow

---

### 4. Challenges Hub (`/challenges`)

#### Components
```
ChallengesPage
├── LocalitySelector (gold bordered card, dropdown)
├── TabSwitcher
│   ├── WelfareTracksTab
│   │   └── TrackCard (repeating)
│   │       ├── CategoryIcon (gold)
│   │       ├── Title
│   │       ├── ProgressBar (community completions)
│   │       ├── RewardIndicator (+50 Standing | +20 IC)
│   │       └── AcceptButton (solid gold)
│   │
│   └── ProclamationsTab
│       ├── RaiseIssueCard (dashed gold border)
│       │   └── "Spot a local problem? Raise a Proclamation."
│       └── ProclamationCard (repeating)
│           ├── UserPhoto
│           ├── ProblemTitle
│           ├── CountdownTimer (14-day window)
│           ├── PowerProgressBar (342/500 Backers)
│           └── BackIssueButton
│
└── SubmitProofModal
    ├── LiveCameraViewfinder (no gallery access)
    ├── CaptureButton (gold circle)
    ├── LocationIndicator
    └── SubmitButton
```

#### APIs
- `GET /api/challenges/categories` - Welfare track categories
- `GET /api/challenges?type=static&locality={id}` - Static challenges by locality
- `GET /api/challenges?type=proclamation&locality={id}` - Active proclamations
- `POST /api/challenges/proclamation` - Raise new proclamation
- `POST /api/challenges/{id}/back` - Back a proclamation
- `POST /api/challenges/{id}/submit` - Submit proof of action

---

### 5. Community Challenges - Impact Circles (`/community`)

#### Components
```
CommunityPage
├── TierGate (if badge < Bronze)
│   ├── LockIcon
│   └── "Achieve Bronze Badge rank to unlock Impact Circle creation."
│
├── CreateCircleCard (if badge >= Bronze)
│   └── FormCircleButton (gold bordered)
│
├── MyCircles
│   └── CircleDashboard
│       ├── ReadyToServeHub
│       │   ├── AvailabilityToggle
│       │   └── ActiveMembersGrid (avatars)
│       ├── ActiveMissions
│       │   └── MissionCard
│       │       ├── Title
│       │       ├── Progress
│       │       └── ICDistributionPanel (for principal)
│       └── EminenceLeaderboard
│           └── LeaderboardRow (rank, circle name, eminence score)
│
└── CreateCircleModal
    ├── NameInput
    ├── AvatarUpload
    ├── MissionStatement
    └── CreateButton
```

#### APIs
- `GET /api/circles` - User's circles
- `GET /api/circles/leaderboard?locality={id}` - Regional leaderboard
- `POST /api/circles` - Create new circle
- `PATCH /api/circles/{id}/ready` - Toggle ready to serve
- `POST /api/circles/{id}/missions` - Create mission
- `POST /api/circles/{id}/distribute` - Distribute IC rewards

---

### 6. The Exchange - Shop (`/exchange`)

#### Components
```
ExchangePage
├── BalanceCard (solid gold)
│   ├── ICBalance (large serif number)
│   └── "Impact Credits Balance (Not convertible to fiat)"
│
├── VoucherGrid
│   └── VoucherCard (repeating)
│       ├── ProductImage
│       ├── Title
│       ├── ICCostPill (gold)
│       └── RedeemButton
│
└── RedemptionModal
    ├── ConfirmationDialog
    └── VoucherReveal
        ├── AlphanumericCode (high contrast)
        └── QRCode
```

#### APIs
- `GET /api/user/balance` - Current IC balance
- `GET /api/vouchers` - Available vouchers
- `POST /api/vouchers/{id}/redeem` - Redeem voucher (atomic transaction)

---

### 7. Notifications (`/notifications`)

#### Components
```
NotificationsPage
├── NotificationList (max-width: 800px)
│   └── NotificationItem (repeating)
│       ├── UnreadIndicator (gold dot)
│       ├── Icon (based on type)
│       ├── Message
│       │   ├── SocialType: "[User] and 3 others vouched for your post"
│       │   └── CivicType: "⚠️ Action Required: A Proclamation reached threshold!"
│       └── Timestamp
```

#### APIs
- `GET /api/notifications` - User's notifications
- `PATCH /api/notifications/read` - Mark as read
- Real-time: Supabase subscription on notifications table

---

### 8. Profile - Civic Resume (`/profile/{id}`)

#### Components
```
ProfilePage
├── IdentityHeader
│   ├── AvatarFrame (ring color = badge tier)
│   ├── DisplayName
│   └── MetricsDashboard
│       ├── BelieversCount
│       ├── BelievingCount
│       └── StandingScore
│
├── ActionButtons (if own profile)
│   ├── EditProfileButton
│   └── SettingsButton
│
├── BelieveButton (if other profile, gold)
│
└── PortfolioTabs
    ├── MediaFeedTab (3-column grid, standard posts)
    └── VerifiedActionsTab (gold shield watermark on each)
        └── VerifiedActionCard
            ├── Thumbnail
            ├── GoldShieldIcon
            └── ChallengeName
```

#### APIs
- `GET /api/users/{id}` - User profile
- `GET /api/users/{id}/posts` - User's posts
- `GET /api/users/{id}/verified-actions` - Completed challenges
- `POST /api/users/{id}/follow` - Follow user
- `DELETE /api/users/{id}/follow` - Unfollow user

---

### 9. Settings (`/settings`)

#### Components
```
SettingsPage
├── DesktopLayout
│   ├── SettingsNav (left)
│   └── SettingsPanel (right)
│
├── MobileLayout
│   └── SettingsTree (expandable rows)
│
├── AccountSection
│   ├── PasswordChangeForm (for admins/fallback accounts)
│   └── DeleteAccountOption
│
├── ProfileSection
│   ├── DisplayNameInput
│   ├── AvatarUpload
│   └── BioInput
│
└── InterfaceSection
    └── ThemeToggle (future: light/dark)
```

#### APIs
- `PATCH /api/user/profile` - Update profile
- `PATCH /api/user/password` - Change password
- `DELETE /api/user` - Delete account

---

## Core Features & Business Logic

### 1. Dual-Pin System

**Native Pin:**
- Set once during onboarding
- Can only be changed once per year
- Determines "hometown" for regional leaderboards and proclamations

**Active Pin:**
- Real-time GPS location
- Updated on each session
- Used for challenge proximity verification

### 2. Standing (Reputation Score)

**Earning Standing:**
- Complete static challenge: +50 Standing
- Verified proclamation completion: +30-100 Standing (varies)
- Receive vouches on posts: +1 Standing per vouch
- Referred user reaches Bronze: +100 Standing

**Spending Standing:**
- Raise a Proclamation: -5 Standing (spam prevention)
- Back a Proclamation: Standing is pledged (returned if issue expires unfunded)

**Standing is NON-SPENDABLE** - It's a permanent reputation metric.

### 3. Impact Credits (IC)

**Earning IC:**
- Complete static challenge: +20 IC
- Verified proclamation completion: +10-50 IC
- Bonus from Impact Circle distributions

**Spending IC:**
- Redeem vouchers in The Exchange

**IC is SPENDABLE but NOT convertible to fiat currency.**

### 4. Badge Tier System

| Badge | Standing Required | Unlocks |
|-------|-------------------|---------|
| Citizen | 0 - 499 | Basic features |
| Bronze | 500 - 1,999 | Create Impact Circles, priority in feed |
| Silver | 2,000 - 4,999 | Steward roles, higher voucher access |
| Gold | 5,000+ | Admin nomination eligibility, exclusive rewards |

### 5. Anti-Cheat Pipeline

**Frontend:**
1. Camera opens via `navigator.mediaDevices.getUserMedia()` (no gallery)
2. On capture, call `navigator.geolocation.getCurrentPosition()`
3. Send image blob + claimed coordinates to server

**Backend:**
1. Parse image with `exif-reader` to extract embedded GPS + timestamp
2. Compare claimed coordinates vs EXIF coordinates using PostGIS `ST_Distance`
3. If distance > 50 meters → REJECT with "Location mismatch"
4. If EXIF timestamp > 10 minutes old → REJECT with "Stale image"
5. If no EXIF GPS data → Flag for manual review
6. Pass to AWS Rekognition for content moderation
7. If explicit content detected → REJECT

### 6. Proclamation Lifecycle

```
[RAISED] → User raises issue, pays 5 Standing
    ↓
[PENDING] → 14-day voting window, needs power_threshold backers
    ↓
[THRESHOLD MET] → Converts to active challenge, backers notified
    ↓
[ACTIVE] → Citizens can submit proof
    ↓
[COMPLETED] → All participants rewarded
```

If threshold not met within 14 days → EXPIRED, Standing returned to all backers.

### 7. Impact Circle Workflow

1. Bronze+ user creates Impact Circle
2. Invites members (Bronze+ only)
3. Principal toggles "Ready to Serve" visibility
4. Creates group missions (larger challenges)
5. Members complete, principal distributes IC rewards
6. Circle's Eminence Score = sum of all members' Standing

---

## API Endpoints Summary

### Authentication
```
POST   /api/auth/google          - Initiate Google OAuth
GET    /api/auth/callback        - OAuth callback
POST   /api/auth/logout          - Logout
GET    /api/auth/me              - Current user
```

### Users
```
GET    /api/users/:id            - Get user profile
PATCH  /api/users/me             - Update own profile
PATCH  /api/users/me/native-pin  - Set native pin (once/year)
POST   /api/users/:id/follow     - Follow user
DELETE /api/users/:id/follow     - Unfollow user
GET    /api/users/:id/posts      - User's posts
GET    /api/users/:id/verified   - User's verified actions
GET    /api/users/me/balance     - Get IC balance
```

### Feed
```
GET    /api/feed/for-you         - Global moderated feed
GET    /api/feed/believing       - Following feed
GET    /api/feed/challenges      - Challenge completions feed
```

### Posts
```
POST   /api/posts                - Create post
GET    /api/posts/:id            - Get post
DELETE /api/posts/:id            - Delete post
POST   /api/posts/:id/vouch      - Vouch for post
DELETE /api/posts/:id/vouch      - Remove vouch
POST   /api/posts/:id/comments   - Add comment
GET    /api/posts/:id/comments   - Get comments
POST   /api/posts/:id/save       - Save post
DELETE /api/posts/:id/save       - Unsave post
```

### Challenges
```
GET    /api/challenges/categories         - Get welfare categories
GET    /api/challenges                    - List challenges (filter by type, locality)
GET    /api/challenges/:id                - Get challenge details
POST   /api/challenges/proclamation       - Raise proclamation
POST   /api/challenges/:id/back           - Back proclamation
POST   /api/challenges/:id/submit         - Submit proof of action
GET    /api/challenges/:id/submissions    - Get submissions (admin)
PATCH  /api/challenges/submissions/:id    - Verify/reject submission (admin)
```

### Impact Circles
```
GET    /api/circles                       - User's circles
POST   /api/circles                       - Create circle
GET    /api/circles/:id                   - Circle details
PATCH  /api/circles/:id                   - Update circle
POST   /api/circles/:id/members           - Invite member
DELETE /api/circles/:id/members/:userId   - Remove member
PATCH  /api/circles/:id/ready             - Toggle ready to serve
GET    /api/circles/leaderboard           - Regional leaderboard
POST   /api/circles/:id/missions          - Create mission
POST   /api/circles/:id/distribute        - Distribute IC
```

### Exchange
```
GET    /api/vouchers                      - Available vouchers
POST   /api/vouchers/:id/redeem           - Redeem voucher
GET    /api/vouchers/my-redemptions       - User's redeemed vouchers
```

### Notifications
```
GET    /api/notifications                 - User's notifications
PATCH  /api/notifications/read            - Mark all as read
PATCH  /api/notifications/:id/read        - Mark one as read
```

### Search & Explore
```
GET    /api/search                        - Search users/hashtags
GET    /api/explore/trending              - Trending content
GET    /api/explore/suggested             - Suggested users
```

### Admin
```
GET    /api/admin/submissions/pending     - Pending verifications
GET    /api/admin/users                   - User management
PATCH  /api/admin/users/:id/ban           - Ban user
GET    /api/admin/analytics               - Platform analytics
```

---

## File Structure

```
imphere/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (main)/
│   │   │   ├── page.tsx              # Home/Feed
│   │   │   ├── explore/page.tsx
│   │   │   ├── challenges/page.tsx
│   │   │   ├── community/page.tsx
│   │   │   ├── exchange/page.tsx
│   │   │   ├── notifications/page.tsx
│   │   │   ├── profile/[id]/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/                      # API Routes
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── feed/route.ts
│   │   │   ├── posts/route.ts
│   │   │   ├── challenges/route.ts
│   │   │   ├── circles/route.ts
│   │   │   ├── vouchers/route.ts
│   │   │   └── ...
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                       # Shadcn components
│   │   ├── auth/
│   │   ├── feed/
│   │   ├── challenges/
│   │   ├── circles/
│   │   ├── exchange/
│   │   ├── profile/
│   │   └── shared/
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── redis.ts
│   │   ├── cloudinary.ts
│   │   ├── exif.ts
│   │   ├── encryption.ts
│   │   └── utils.ts
│   │
│   ├── hooks/
│   │   ├── useUser.ts
│   │   ├── useFeed.ts
│   │   ├── useChallenges.ts
│   │   └── ...
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   └── constants/
│       ├── badges.ts
│       └── localities.ts
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed.sql
│
├── public/
│   └── ...
│
├── .env.example
├── .env.local
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Encryption (for vouchers)
VOUCHER_ENCRYPTION_KEY=

# AWS Rekognition (optional for MVP)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Development Phases

### Phase 1: Foundation
- [x] Project setup (Next.js, Tailwind, Shadcn)
- [ ] Supabase schema + migrations
- [ ] Auth (Google OAuth via Supabase)
- [ ] Onboarding flow (Native Pin)

### Phase 2: Core Social
- [ ] Home feed (3 tabs)
- [ ] Post creation
- [ ] Vouch, Comment, Save, Share
- [ ] Follow/Unfollow
- [ ] Profile page

### Phase 3: Challenges
- [ ] Static welfare tracks
- [ ] Anti-cheat camera module
- [ ] Proof submission + verification
- [ ] Proclamation system

### Phase 4: Community
- [ ] Impact Circles
- [ ] Ready to Serve
- [ ] Group missions
- [ ] IC distribution

### Phase 5: Exchange
- [ ] Voucher catalog
- [ ] Redemption flow
- [ ] QR code generation

### Phase 6: Polish
- [ ] Notifications (real-time)
- [ ] Search & Explore
- [ ] Settings
- [ ] Admin dashboard
- [ ] Content moderation integration

---

## Ready to Build

This specification covers all screens, features, APIs, and database schema needed to build IMPHERE end-to-end. Shall I proceed with implementation?
