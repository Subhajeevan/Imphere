/**
 * IMPHERE — Mock Data
 *
 * Type-safe, referentially-consistent mock data for local development.
 * Every record uses the exact Supabase Row types from the auto-generated
 * database.types.ts file to guarantee compile-time correctness.
 *
 * PostGIS geometry fields use the GeoJSON Point format which is what
 * Supabase returns when reading GEOGRAPHY(POINT, 4326) columns.
 *
 * UUID constants are defined at the top of the file so foreign keys
 * are always consistent across all tables.
 */

import type { Tables } from '@/types/database.types'

// ============================================================================
// PART 1 — UUID CONSTANTS
// ============================================================================

const USER_IDS = {
  arjun:  'a1000000-0000-0000-0000-000000000001',
  priya:  'a1000000-0000-0000-0000-000000000002',
  rahul:  'a1000000-0000-0000-0000-000000000003',
  meera:  'a1000000-0000-0000-0000-000000000004',
  vikram: 'a1000000-0000-0000-0000-000000000005',
  ananya: 'a1000000-0000-0000-0000-000000000006',
  kiran:  'a1000000-0000-0000-0000-000000000007',
  dev:    'a1000000-0000-0000-0000-000000000008',
} as const

const CATEGORY_IDS = {
  environment: 'b1000000-0000-0000-0000-000000000001',
  health:      'b1000000-0000-0000-0000-000000000002',
  education:   'b1000000-0000-0000-0000-000000000003',
  community:   'b1000000-0000-0000-0000-000000000004',
} as const

const CHALLENGE_IDS = {
  c1: 'c1000000-0000-0000-0000-000000000001',
  c2: 'c1000000-0000-0000-0000-000000000002',
  c3: 'c1000000-0000-0000-0000-000000000003',
  c4: 'c1000000-0000-0000-0000-000000000004',
  c5: 'c1000000-0000-0000-0000-000000000005',
} as const

const POST_IDS = {
  p1:  'd1000000-0000-0000-0000-000000000001',
  p2:  'd1000000-0000-0000-0000-000000000002',
  p3:  'd1000000-0000-0000-0000-000000000003',
  p4:  'd1000000-0000-0000-0000-000000000004',
  p5:  'd1000000-0000-0000-0000-000000000005',
  p6:  'd1000000-0000-0000-0000-000000000006',
  p7:  'd1000000-0000-0000-0000-000000000007',
  p8:  'd1000000-0000-0000-0000-000000000008',
  p9:  'd1000000-0000-0000-0000-000000000009',
  p10: 'd1000000-0000-0000-0000-000000000010',
} as const

const CIRCLE_IDS = {
  green: 'e1000000-0000-0000-0000-000000000001',
  blood: 'e1000000-0000-0000-0000-000000000002',
  clean: 'e1000000-0000-0000-0000-000000000003',
} as const

const SUBMISSION_IDS = {
  s1: 'f1000000-0000-0000-0000-000000000001',
  s2: 'f1000000-0000-0000-0000-000000000002',
  s3: 'f1000000-0000-0000-0000-000000000003',
  s4: 'f1000000-0000-0000-0000-000000000004',
  s5: 'f1000000-0000-0000-0000-000000000005',
  s6: 'f1000000-0000-0000-0000-000000000006',
} as const

const COMMENT_IDS = {
  cm1: 'g1000000-0000-0000-0000-000000000001',
  cm2: 'g1000000-0000-0000-0000-000000000002',
  cm3: 'g1000000-0000-0000-0000-000000000003',
  cm4: 'g1000000-0000-0000-0000-000000000004',
  cm5: 'g1000000-0000-0000-0000-000000000005',
  cm6: 'g1000000-0000-0000-0000-000000000006',
  cm7: 'g1000000-0000-0000-0000-000000000007',
  cm8: 'g1000000-0000-0000-0000-000000000008',
} as const

const VOUCHER_IDS = {
  v1: 'h1000000-0000-0000-0000-000000000001',
  v2: 'h1000000-0000-0000-0000-000000000002',
  v3: 'h1000000-0000-0000-0000-000000000003',
  v4: 'h1000000-0000-0000-0000-000000000004',
} as const

// ============================================================================
// PART 2 — POSTGIS HELPER
// ============================================================================

/**
 * Creates a GeoJSON Point object matching the format Supabase returns
 * for GEOGRAPHY(POINT, 4326) columns.
 *
 * Coordinate order: longitude first, latitude second (GeoJSON standard).
 */
const point = (lng: number, lat: number) => ({
  type: 'Point' as const,
  coordinates: [lng, lat] as [number, number],
})

// Verified Indian city coordinates
const LOCATIONS = {
  hyderabad:      point(78.4867, 17.3850),
  bangalore:      point(77.5946, 12.9716),
  mumbai:         point(72.8777, 19.0760),
  chennai:        point(80.2707, 13.0827),
  delhi:          point(77.2090, 28.6139),
  pune:           point(73.8567, 18.5204),
  kolkata:        point(88.3639, 22.5726),
  ahmedabad:      point(72.5714, 23.0225),
  kochi:          point(76.2673,  9.9312),
  jubileeHills:   point(78.4071, 17.4310),
  banjaraHills:   point(78.4482, 17.4126),
  koramangala:    point(77.6245, 12.9352),
  andheri:        point(72.8479, 19.1136),
  tankBund:       point(78.4744, 17.4126),
  rajajinagar:    point(77.5538, 12.9972),
  annaNagar:      point(80.2101, 13.0850),
  cherai:         point(76.1851, 10.1399),
  vasantKunj:     point(77.1579, 28.5213),
  gachibowli:     point(78.3420, 17.4399),
  kothrud:        point(73.8079, 18.5074),
  indiranagar:    point(77.6408, 12.9784),
} as const

// ============================================================================
// PART 3 — DATE HELPERS
// ============================================================================

const now = new Date()

/** Returns an ISO string for N days ago from now */
const daysAgo = (n: number) =>
  new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString()

/** Returns an ISO string for N days from now */
const daysFromNow = (n: number) =>
  new Date(now.getTime() + n * 24 * 60 * 60 * 1000).toISOString()

// ============================================================================
// PART 4 — PROFILES (8 users)
// ============================================================================

const mockProfiles: Tables<'profiles'>[] = [
  {
    id: USER_IDS.arjun,
    email: 'arjun.mehta@imphere.app',
    display_name: 'Arjun Mehta',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ArjunMehta',
    bio: 'Environmental activist and urban farmer. Planted 500+ trees across Hyderabad. Building greener cities one sapling at a time.',
    role: 'admin',
    onboarding_status: 'active',
    is_banned: false,
    native_pin_name: 'Hyderabad',
    native_pin_location: LOCATIONS.hyderabad,
    native_pin_set_at: daysAgo(270),
    active_location: LOCATIONS.hyderabad,
    active_location_updated_at: daysAgo(0),
    standing: 11240,
    impact_credits: 1850,
    badge: 'Gold',
    created_at: daysAgo(365),
    updated_at: daysAgo(1),
  },
  {
    id: USER_IDS.priya,
    email: 'priya.venkatesh@imphere.app',
    display_name: 'Priya Venkatesh',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PriyaVenkatesh',
    bio: 'Blood donation advocate. Organised 12 donation camps. Every drop counts for a life saved.',
    role: 'user',
    onboarding_status: 'active',
    is_banned: false,
    native_pin_name: 'Bangalore',
    native_pin_location: LOCATIONS.bangalore,
    native_pin_set_at: daysAgo(300),
    active_location: LOCATIONS.bangalore,
    active_location_updated_at: daysAgo(0),
    standing: 8750,
    impact_credits: 1420,
    badge: 'Gold',
    created_at: daysAgo(330),
    updated_at: daysAgo(2),
  },
  {
    id: USER_IDS.rahul,
    email: 'rahul.sharma@imphere.app',
    display_name: 'Rahul Sharma',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=RahulSharma',
    bio: 'Civic tech enthusiast from Bangalore. Working on making public spaces cleaner and safer for everyone.',
    role: 'user',
    onboarding_status: 'active',
    is_banned: false,
    native_pin_name: 'Bangalore',
    native_pin_location: LOCATIONS.bangalore,
    native_pin_set_at: daysAgo(240),
    active_location: LOCATIONS.koramangala,
    active_location_updated_at: daysAgo(1),
    standing: 4200,
    impact_credits: 680,
    badge: 'Silver',
    created_at: daysAgo(280),
    updated_at: daysAgo(3),
  },
  {
    id: USER_IDS.meera,
    email: 'meera.iyer@imphere.app',
    display_name: 'Meera Iyer',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MeeraIyer',
    bio: 'Teacher and education volunteer. Teaching digital literacy to seniors and underprivileged children in Chennai.',
    role: 'user',
    onboarding_status: 'active',
    is_banned: false,
    native_pin_name: 'Chennai',
    native_pin_location: LOCATIONS.chennai,
    native_pin_set_at: daysAgo(200),
    active_location: LOCATIONS.chennai,
    active_location_updated_at: daysAgo(0),
    standing: 3100,
    impact_credits: 510,
    badge: 'Silver',
    created_at: daysAgo(250),
    updated_at: daysAgo(4),
  },
  {
    id: USER_IDS.vikram,
    email: 'vikram.nair@imphere.app',
    display_name: 'Vikram Nair',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VikramNair',
    bio: 'Beach cleanup warrior from Kochi. Weekend volunteer at local NGOs.',
    role: 'user',
    onboarding_status: 'active',
    is_banned: false,
    native_pin_name: 'Kochi',
    native_pin_location: LOCATIONS.kochi,
    native_pin_set_at: daysAgo(180),
    active_location: LOCATIONS.kochi,
    active_location_updated_at: daysAgo(1),
    standing: 1650,
    impact_credits: 290,
    badge: 'Bronze',
    created_at: daysAgo(220),
    updated_at: daysAgo(5),
  },
  {
    id: USER_IDS.ananya,
    email: 'ananya.gupta@imphere.app',
    display_name: 'Ananya Gupta',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AnanyaGupta',
    bio: 'Zero waste enthusiast and composting nerd. Delhi cannot wait for someone else to clean it up.',
    role: 'user',
    onboarding_status: 'active',
    is_banned: false,
    native_pin_name: 'Delhi',
    native_pin_location: LOCATIONS.delhi,
    native_pin_set_at: daysAgo(150),
    active_location: LOCATIONS.delhi,
    active_location_updated_at: daysAgo(0),
    standing: 920,
    impact_credits: 175,
    badge: 'Bronze',
    created_at: daysAgo(190),
    updated_at: daysAgo(2),
  },
  {
    id: USER_IDS.kiran,
    email: 'kiran.reddy@imphere.app',
    display_name: 'Kiran Reddy',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=KiranReddy',
    bio: 'Just started my impact journey. Inspired by my city and the people making a difference here.',
    role: 'user',
    onboarding_status: 'active',
    is_banned: false,
    native_pin_name: 'Hyderabad',
    native_pin_location: LOCATIONS.hyderabad,
    native_pin_set_at: daysAgo(60),
    active_location: LOCATIONS.gachibowli,
    active_location_updated_at: daysAgo(0),
    standing: 340,
    impact_credits: 60,
    badge: 'Citizen',
    created_at: daysAgo(90),
    updated_at: daysAgo(1),
  },
  {
    id: USER_IDS.dev,
    email: 'dev.pillai@imphere.app',
    display_name: 'Dev Pillai',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DevPillai',
    bio: 'College student passionate about sustainability and community service.',
    role: 'user',
    onboarding_status: 'active',
    is_banned: false,
    native_pin_name: 'Pune',
    native_pin_location: LOCATIONS.pune,
    native_pin_set_at: daysAgo(45),
    active_location: LOCATIONS.pune,
    active_location_updated_at: daysAgo(1),
    standing: 180,
    impact_credits: 35,
    badge: 'Citizen',
    created_at: daysAgo(75),
    updated_at: daysAgo(3),
  },
]

// ============================================================================
// PART 5 — CHALLENGE CATEGORIES (4)
// ============================================================================

const mockChallengeCategories: Tables<'challenge_categories'>[] = [
  {
    id: CATEGORY_IDS.environment,
    name: 'Environment',
    description: 'Tree planting, cleanups, waste management, and green initiatives',
    icon: '🌱',
    color: '#16a34a',
    display_order: 1,
    is_active: true,
    created_at: daysAgo(365),
  },
  {
    id: CATEGORY_IDS.health,
    name: 'Health & Wellness',
    description: 'Blood donation, health camps, and community wellness drives',
    icon: '❤️',
    color: '#dc2626',
    display_order: 2,
    is_active: true,
    created_at: daysAgo(365),
  },
  {
    id: CATEGORY_IDS.education,
    name: 'Education',
    description: 'Teaching, tutoring, digital literacy, and skill sharing initiatives',
    icon: '📚',
    color: '#2563eb',
    display_order: 3,
    is_active: true,
    created_at: daysAgo(365),
  },
  {
    id: CATEGORY_IDS.community,
    name: 'Community',
    description: 'Neighbourhood improvement, civic engagement, and local action',
    icon: '🤝',
    color: '#d97706',
    display_order: 4,
    is_active: true,
    created_at: daysAgo(365),
  },
]

// ============================================================================
// PART 6 — CHALLENGES (5)
// ============================================================================

const mockChallenges: Tables<'challenges'>[] = [
  {
    id: CHALLENGE_IDS.c1,
    title: 'Plant 10 Trees in Your Locality',
    description: 'Choose any public space, park, or roadside in your city. Plant a minimum of 10 native saplings and document each one with a geotagged photo.',
    type: 'static',
    status: 'active',
    category_id: CATEGORY_IDS.environment,
    created_by: USER_IDS.arjun,
    location: LOCATIONS.hyderabad,
    locality_name: 'Hyderabad',
    standing_reward: 200,
    ic_reward: 50,
    power_threshold: 1000,
    current_power: 640,
    participant_count: 34,
    completion_count: 12,
    expires_at: daysFromNow(90),
    created_at: daysAgo(60),
    updated_at: daysAgo(2),
  },
  {
    id: CHALLENGE_IDS.c2,
    title: 'Organise a Blood Donation Camp',
    description: 'Partner with a local hospital or blood bank to organise a camp in your neighbourhood. Minimum 10 donors required for completion.',
    type: 'static',
    status: 'active',
    category_id: CATEGORY_IDS.health,
    created_by: USER_IDS.priya,
    location: LOCATIONS.bangalore,
    locality_name: 'Bangalore',
    standing_reward: 300,
    ic_reward: 80,
    power_threshold: 800,
    current_power: 520,
    participant_count: 22,
    completion_count: 8,
    expires_at: daysFromNow(60),
    created_at: daysAgo(45),
    updated_at: daysAgo(3),
  },
  {
    id: CHALLENGE_IDS.c3,
    title: 'Proclamation: Ban Single-Use Plastic in Jubilee Hills',
    description: 'We call on all residents, shop owners, and restaurants in Jubilee Hills to pledge a complete ban on single-use plastic. Add your voice and show your support with proof of your plastic-free switch.',
    type: 'proclamation',
    status: 'active',
    category_id: CATEGORY_IDS.environment,
    created_by: USER_IDS.arjun,
    location: LOCATIONS.jubileeHills,
    locality_name: 'Jubilee Hills, Hyderabad',
    standing_reward: 150,
    ic_reward: 30,
    power_threshold: 500,
    current_power: 380,
    participant_count: 47,
    completion_count: 31,
    expires_at: daysFromNow(45),
    created_at: daysAgo(30),
    updated_at: daysAgo(1),
  },
  {
    id: CHALLENGE_IDS.c4,
    title: 'Teach Digital Literacy to 5 Seniors',
    description: 'Spend at least 2 hours teaching smartphone basics, UPI payments, or video calling to elderly citizens in your area. Document the session.',
    type: 'static',
    status: 'completed',
    category_id: CATEGORY_IDS.education,
    created_by: USER_IDS.meera,
    location: LOCATIONS.chennai,
    locality_name: 'Chennai',
    standing_reward: 250,
    ic_reward: 60,
    power_threshold: 600,
    current_power: 600,
    participant_count: 18,
    completion_count: 18,
    expires_at: daysAgo(30),
    created_at: daysAgo(90),
    updated_at: daysAgo(30),
  },
  {
    id: CHALLENGE_IDS.c5,
    title: 'Proclamation: Fix the Potholes on Koramangala 80 Feet Road',
    description: 'Residents of Koramangala have been raising this issue for months. Sign this proclamation to demand immediate repair from BBMP. Upload a photo of the damage near your building.',
    type: 'proclamation',
    status: 'active',
    category_id: CATEGORY_IDS.community,
    created_by: USER_IDS.rahul,
    location: LOCATIONS.koramangala,
    locality_name: 'Koramangala, Bangalore',
    standing_reward: 100,
    ic_reward: 20,
    power_threshold: 300,
    current_power: 245,
    participant_count: 29,
    completion_count: 19,
    expires_at: daysFromNow(30),
    created_at: daysAgo(20),
    updated_at: daysAgo(1),
  },
]

// ============================================================================
// PART 7 — POSTS (10)
// ============================================================================

const mockPosts: Tables<'posts'>[] = [
  {
    id: POST_IDS.p1,
    author_id: USER_IDS.arjun,
    caption: 'Just planted 12 native saplings along the Tank Bund walkway today 🌱 Every tree is a vote for the future. Join the challenge and let us make Hyderabad greener together!',
    media_url: 'https://picsum.photos/seed/trees1/800/600',
    media_type: 'image',
    location: LOCATIONS.tankBund,
    locality_name: 'Tank Bund, Hyderabad',
    is_challenge_proof: true,
    challenge_id: CHALLENGE_IDS.c1,
    submission_id: SUBMISSION_IDS.s1,
    is_approved: true,
    moderation_status: 'approved',
    vouch_count: 42,
    comment_count: 8,
    save_count: 6,
    share_count: 3,
    created_at: daysAgo(5),
    updated_at: daysAgo(5),
  },
  {
    id: POST_IDS.p2,
    author_id: USER_IDS.priya,
    caption: 'Successful blood donation camp at Rajajinagar today — 23 donors showed up! Special thanks to Apollo Blood Bank for partnering with us. Every unit saves up to 3 lives ❤️',
    media_url: 'https://picsum.photos/seed/blood1/800/600',
    media_type: 'image',
    location: LOCATIONS.rajajinagar,
    locality_name: 'Rajajinagar, Bangalore',
    is_challenge_proof: true,
    challenge_id: CHALLENGE_IDS.c2,
    submission_id: SUBMISSION_IDS.s2,
    is_approved: true,
    moderation_status: 'approved',
    vouch_count: 38,
    comment_count: 11,
    save_count: 5,
    share_count: 4,
    created_at: daysAgo(7),
    updated_at: daysAgo(7),
  },
  {
    id: POST_IDS.p3,
    author_id: USER_IDS.rahul,
    caption: 'Adding my voice to the Koramangala pothole proclamation. This stretch has been dangerous for two-wheelers for over 6 months. BBMP needs to act NOW. Tag your councillor. 📢',
    media_url: 'https://picsum.photos/seed/clean1/800/600',
    media_type: 'image',
    location: LOCATIONS.koramangala,
    locality_name: 'Koramangala, Bangalore',
    is_challenge_proof: true,
    challenge_id: CHALLENGE_IDS.c5,
    submission_id: SUBMISSION_IDS.s3,
    is_approved: true,
    moderation_status: 'approved',
    vouch_count: 29,
    comment_count: 7,
    save_count: 2,
    share_count: 5,
    created_at: daysAgo(4),
    updated_at: daysAgo(4),
  },
  {
    id: POST_IDS.p4,
    author_id: USER_IDS.meera,
    caption: 'Spent Sunday morning teaching 8 senior citizens how to use Google Pay and make video calls. The joy on their faces when they video called their grandchildren for the first time was priceless. This is why I do this 🙏',
    media_url: 'https://picsum.photos/seed/teach1/800/600',
    media_type: 'image',
    location: LOCATIONS.annaNagar,
    locality_name: 'Anna Nagar, Chennai',
    is_challenge_proof: false,
    challenge_id: null,
    submission_id: null,
    is_approved: true,
    moderation_status: 'approved',
    vouch_count: 31,
    comment_count: 9,
    save_count: 7,
    share_count: 2,
    created_at: daysAgo(3),
    updated_at: daysAgo(3),
  },
  {
    id: POST_IDS.p5,
    author_id: USER_IDS.vikram,
    caption: 'Beach cleanup at Cherai Beach today — collected 40kg of plastic waste with 15 volunteers. The ocean thanks you all. Next cleanup is Sunday 7am. Who is joining? 🌊♻️',
    media_url: 'https://picsum.photos/seed/park1/800/600',
    media_type: 'image',
    location: LOCATIONS.cherai,
    locality_name: 'Cherai Beach, Kochi',
    is_challenge_proof: false,
    challenge_id: null,
    submission_id: null,
    is_approved: true,
    moderation_status: 'approved',
    vouch_count: 45,
    comment_count: 12,
    save_count: 8,
    share_count: 6,
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },
  {
    id: POST_IDS.p6,
    author_id: USER_IDS.ananya,
    caption: 'Week 3 of zero-waste living. Started a terrace compost bin and now converting all kitchen waste into soil for my plants. Delhi air is bad enough — at least our soil can be healthy 🌿',
    media_url: 'https://picsum.photos/seed/plant2/800/600',
    media_type: 'image',
    location: LOCATIONS.vasantKunj,
    locality_name: 'Vasant Kunj, Delhi',
    is_challenge_proof: false,
    challenge_id: null,
    submission_id: null,
    is_approved: true,
    moderation_status: 'approved',
    vouch_count: 22,
    comment_count: 5,
    save_count: 4,
    share_count: 1,
    created_at: daysAgo(6),
    updated_at: daysAgo(6),
  },
  {
    id: POST_IDS.p7,
    author_id: USER_IDS.kiran,
    caption: 'First time volunteering at a tree plantation drive. Never realised how satisfying it feels to put a sapling in the ground and know it will outlive you. Starting my impact journey today! 🌱',
    media_url: 'https://picsum.photos/seed/camp1/800/600',
    media_type: 'image',
    location: LOCATIONS.gachibowli,
    locality_name: 'Gachibowli, Hyderabad',
    is_challenge_proof: false,
    challenge_id: null,
    submission_id: null,
    is_approved: true,
    moderation_status: 'approved',
    vouch_count: 18,
    comment_count: 6,
    save_count: 3,
    share_count: 1,
    created_at: daysAgo(8),
    updated_at: daysAgo(8),
  },
  {
    id: POST_IDS.p8,
    author_id: USER_IDS.dev,
    caption: 'Organised a small clothes donation drive in my college hostel. Collected 4 bags for Goonj. Even small actions matter. Who wants to collaborate on the next one? 📦',
    media_url: 'https://picsum.photos/seed/waste1/800/600',
    media_type: 'image',
    location: LOCATIONS.kothrud,
    locality_name: 'Kothrud, Pune',
    is_challenge_proof: false,
    challenge_id: null,
    submission_id: null,
    is_approved: true,
    moderation_status: 'approved',
    vouch_count: 14,
    comment_count: 4,
    save_count: 2,
    share_count: 1,
    created_at: daysAgo(10),
    updated_at: daysAgo(10),
  },
  {
    id: POST_IDS.p9,
    author_id: USER_IDS.arjun,
    caption: 'Native plant nursery in my terrace now has 80 saplings ready for the next planting season. If you are in Hyderabad and want free saplings for your next drive DM me. Neem, peepal, gulmohar available 🌳',
    media_url: 'https://picsum.photos/seed/cycle1/800/600',
    media_type: 'image',
    location: LOCATIONS.banjaraHills,
    locality_name: 'Banjara Hills, Hyderabad',
    is_challenge_proof: false,
    challenge_id: null,
    submission_id: null,
    is_approved: true,
    moderation_status: 'approved',
    vouch_count: 35,
    comment_count: 14,
    save_count: 9,
    share_count: 4,
    created_at: daysAgo(12),
    updated_at: daysAgo(12),
  },
  {
    id: POST_IDS.p10,
    author_id: USER_IDS.priya,
    caption: 'Reached Gold badge today on Imphere! 500 standing points from blood donation coordination alone. If you have not donated blood yet — it costs you nothing and saves everything for someone else. Find a camp near you ❤️',
    media_url: 'https://picsum.photos/seed/garden1/800/600',
    media_type: 'image',
    location: LOCATIONS.indiranagar,
    locality_name: 'Indiranagar, Bangalore',
    is_challenge_proof: false,
    challenge_id: null,
    submission_id: null,
    is_approved: true,
    moderation_status: 'approved',
    vouch_count: 52,
    comment_count: 16,
    save_count: 11,
    share_count: 7,
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
]

// ============================================================================
// PART 8 — CHALLENGE SUBMISSIONS (6)
// ============================================================================

const mockChallengeSubmissions: Tables<'challenge_submissions'>[] = [
  {
    id: SUBMISSION_IDS.s1,
    challenge_id: CHALLENGE_IDS.c1,
    user_id: USER_IDS.arjun,
    media_url: 'https://picsum.photos/seed/sub1/800/600',
    media_type: 'image',
    status: 'verified',
    claimed_location: LOCATIONS.tankBund,
    claimed_timestamp: daysAgo(5),
    exif_location: LOCATIONS.tankBund,
    exif_timestamp: daysAgo(5),
    location_distance_meters: 12,
    location_verified: true,
    standing_awarded: 200,
    ic_awarded: 50,
    verified_by: USER_IDS.arjun,
    verified_at: daysAgo(4),
    rejection_reason: null,
    created_at: daysAgo(5),
  },
  {
    id: SUBMISSION_IDS.s2,
    challenge_id: CHALLENGE_IDS.c2,
    user_id: USER_IDS.priya,
    media_url: 'https://picsum.photos/seed/sub2/800/600',
    media_type: 'image',
    status: 'verified',
    claimed_location: LOCATIONS.rajajinagar,
    claimed_timestamp: daysAgo(7),
    exif_location: LOCATIONS.rajajinagar,
    exif_timestamp: daysAgo(7),
    location_distance_meters: 8,
    location_verified: true,
    standing_awarded: 300,
    ic_awarded: 80,
    verified_by: USER_IDS.arjun,
    verified_at: daysAgo(6),
    rejection_reason: null,
    created_at: daysAgo(7),
  },
  {
    id: SUBMISSION_IDS.s3,
    challenge_id: CHALLENGE_IDS.c5,
    user_id: USER_IDS.rahul,
    media_url: 'https://picsum.photos/seed/sub3/800/600',
    media_type: 'image',
    status: 'verified',
    claimed_location: LOCATIONS.koramangala,
    claimed_timestamp: daysAgo(4),
    exif_location: LOCATIONS.koramangala,
    exif_timestamp: daysAgo(4),
    location_distance_meters: 15,
    location_verified: true,
    standing_awarded: 100,
    ic_awarded: 20,
    verified_by: USER_IDS.arjun,
    verified_at: daysAgo(3),
    rejection_reason: null,
    created_at: daysAgo(4),
  },
  {
    id: SUBMISSION_IDS.s4,
    challenge_id: CHALLENGE_IDS.c1,
    user_id: USER_IDS.kiran,
    media_url: 'https://picsum.photos/seed/sub4/800/600',
    media_type: 'image',
    status: 'pending',
    claimed_location: LOCATIONS.gachibowli,
    claimed_timestamp: daysAgo(2),
    exif_location: LOCATIONS.gachibowli,
    exif_timestamp: daysAgo(2),
    location_distance_meters: 22,
    location_verified: false,
    standing_awarded: null,
    ic_awarded: null,
    verified_by: null,
    verified_at: null,
    rejection_reason: null,
    created_at: daysAgo(2),
  },
  {
    id: SUBMISSION_IDS.s5,
    challenge_id: CHALLENGE_IDS.c3,
    user_id: USER_IDS.vikram,
    media_url: 'https://picsum.photos/seed/sub5/800/600',
    media_type: 'image',
    status: 'pending',
    claimed_location: LOCATIONS.kochi,
    claimed_timestamp: daysAgo(1),
    exif_location: LOCATIONS.kochi,
    exif_timestamp: daysAgo(1),
    location_distance_meters: 35,
    location_verified: false,
    standing_awarded: null,
    ic_awarded: null,
    verified_by: null,
    verified_at: null,
    rejection_reason: null,
    created_at: daysAgo(1),
  },
  {
    id: SUBMISSION_IDS.s6,
    challenge_id: CHALLENGE_IDS.c2,
    user_id: USER_IDS.dev,
    media_url: 'https://picsum.photos/seed/sub6/800/600',
    media_type: 'image',
    status: 'rejected',
    claimed_location: LOCATIONS.pune,
    claimed_timestamp: daysAgo(8),
    exif_location: LOCATIONS.pune,
    exif_timestamp: daysAgo(8),
    location_distance_meters: 120,
    location_verified: false,
    standing_awarded: null,
    ic_awarded: null,
    verified_by: USER_IDS.arjun,
    verified_at: daysAgo(7),
    rejection_reason: 'Photo does not clearly show the blood donation process. Please resubmit with a photo taken at the donation centre.',
    created_at: daysAgo(8),
  },
]

// ============================================================================
// PART 9 — CHALLENGE BACKERS (4)
// ============================================================================

const mockChallengeBackers: Tables<'challenge_backers'>[] = [
  {
    id: 'i1000000-0000-0000-0000-000000000001',
    challenge_id: CHALLENGE_IDS.c1,
    user_id: USER_IDS.arjun,
    standing_contributed: 100,
    created_at: daysAgo(55),
  },
  {
    id: 'i1000000-0000-0000-0000-000000000002',
    challenge_id: CHALLENGE_IDS.c2,
    user_id: USER_IDS.priya,
    standing_contributed: 80,
    created_at: daysAgo(40),
  },
  {
    id: 'i1000000-0000-0000-0000-000000000003',
    challenge_id: CHALLENGE_IDS.c3,
    user_id: USER_IDS.rahul,
    standing_contributed: 50,
    created_at: daysAgo(28),
  },
  {
    id: 'i1000000-0000-0000-0000-000000000004',
    challenge_id: CHALLENGE_IDS.c1,
    user_id: USER_IDS.meera,
    standing_contributed: 60,
    created_at: daysAgo(50),
  },
]

// ============================================================================
// PART 10 — COMMENTS (8)
// ============================================================================

const mockComments: Tables<'comments'>[] = [
  {
    id: COMMENT_IDS.cm1,
    post_id: POST_IDS.p1,
    author_id: USER_IDS.arjun,
    parent_id: null,
    content: 'This is incredible! Tank Bund will look beautiful with more native trees. Count me in for the next planting drive!',
    created_at: daysAgo(4),
    updated_at: daysAgo(4),
  },
  {
    id: COMMENT_IDS.cm2,
    post_id: POST_IDS.p1,
    author_id: USER_IDS.priya,
    parent_id: null,
    content: 'Arjun this is amazing. Can we collaborate and do a joint drive with the blood donation circle?',
    created_at: daysAgo(4),
    updated_at: daysAgo(4),
  },
  {
    id: COMMENT_IDS.cm3,
    post_id: POST_IDS.p1,
    author_id: USER_IDS.kiran,
    parent_id: COMMENT_IDS.cm2,
    content: 'Yes please! A combined environment and health day would be so powerful!',
    created_at: daysAgo(3),
    updated_at: daysAgo(3),
  },
  {
    id: COMMENT_IDS.cm4,
    post_id: POST_IDS.p2,
    author_id: USER_IDS.meera,
    parent_id: null,
    content: '23 donors is incredible for a single day camp. You are an inspiration Priya 🙏',
    created_at: daysAgo(6),
    updated_at: daysAgo(6),
  },
  {
    id: COMMENT_IDS.cm5,
    post_id: POST_IDS.p5,
    author_id: USER_IDS.ananya,
    parent_id: null,
    content: '40kg in one day! Wish I could join from Delhi. Is there an online way to support your drives?',
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
  {
    id: COMMENT_IDS.cm6,
    post_id: POST_IDS.p5,
    author_id: USER_IDS.vikram,
    parent_id: COMMENT_IDS.cm5,
    content: 'Yes! Follow our circle and you can support by funding the next cleanup kit. Every rupee helps! 💙',
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
  {
    id: COMMENT_IDS.cm7,
    post_id: POST_IDS.p9,
    author_id: USER_IDS.dev,
    parent_id: null,
    content: 'Arjun bhai I am in Hyderabad! Would love 5 neem saplings for our college campus. Sending you a DM now.',
    created_at: daysAgo(11),
    updated_at: daysAgo(11),
  },
  {
    id: COMMENT_IDS.cm8,
    post_id: POST_IDS.p10,
    author_id: USER_IDS.rahul,
    parent_id: null,
    content: 'Congratulations on Gold badge! The work you do for blood donation awareness is unmatched. Truly deserved 🏆',
    created_at: daysAgo(0),
    updated_at: daysAgo(0),
  },
]

// ============================================================================
// PART 11 — VOUCHES (15)
// ============================================================================

const mockVouches: Tables<'vouches'>[] = [
  { id: 'j1000000-0000-0000-0000-000000000001', user_id: USER_IDS.priya,  post_id: POST_IDS.p1,  created_at: daysAgo(4) },
  { id: 'j1000000-0000-0000-0000-000000000002', user_id: USER_IDS.rahul,  post_id: POST_IDS.p1,  created_at: daysAgo(4) },
  { id: 'j1000000-0000-0000-0000-000000000003', user_id: USER_IDS.meera,  post_id: POST_IDS.p1,  created_at: daysAgo(3) },
  { id: 'j1000000-0000-0000-0000-000000000004', user_id: USER_IDS.vikram, post_id: POST_IDS.p2,  created_at: daysAgo(6) },
  { id: 'j1000000-0000-0000-0000-000000000005', user_id: USER_IDS.ananya, post_id: POST_IDS.p2,  created_at: daysAgo(6) },
  { id: 'j1000000-0000-0000-0000-000000000006', user_id: USER_IDS.kiran,  post_id: POST_IDS.p2,  created_at: daysAgo(5) },
  { id: 'j1000000-0000-0000-0000-000000000007', user_id: USER_IDS.dev,    post_id: POST_IDS.p2,  created_at: daysAgo(5) },
  { id: 'j1000000-0000-0000-0000-000000000008', user_id: USER_IDS.arjun,  post_id: POST_IDS.p5,  created_at: daysAgo(1) },
  { id: 'j1000000-0000-0000-0000-000000000009', user_id: USER_IDS.priya,  post_id: POST_IDS.p5,  created_at: daysAgo(1) },
  { id: 'j1000000-0000-0000-0000-000000000010', user_id: USER_IDS.meera,  post_id: POST_IDS.p5,  created_at: daysAgo(1) },
  { id: 'j1000000-0000-0000-0000-000000000011', user_id: USER_IDS.rahul,  post_id: POST_IDS.p4,  created_at: daysAgo(2) },
  { id: 'j1000000-0000-0000-0000-000000000012', user_id: USER_IDS.vikram, post_id: POST_IDS.p9,  created_at: daysAgo(11) },
  { id: 'j1000000-0000-0000-0000-000000000013', user_id: USER_IDS.ananya, post_id: POST_IDS.p10, created_at: daysAgo(0) },
  { id: 'j1000000-0000-0000-0000-000000000014', user_id: USER_IDS.kiran,  post_id: POST_IDS.p10, created_at: daysAgo(0) },
  { id: 'j1000000-0000-0000-0000-000000000015', user_id: USER_IDS.dev,    post_id: POST_IDS.p7,  created_at: daysAgo(7) },
]

// ============================================================================
// PART 12 — SAVES (8)
// ============================================================================

const mockSaves: Tables<'saves'>[] = [
  { id: 'k1000000-0000-0000-0000-000000000001', user_id: USER_IDS.kiran,  post_id: POST_IDS.p1,  created_at: daysAgo(4) },
  { id: 'k1000000-0000-0000-0000-000000000002', user_id: USER_IDS.dev,    post_id: POST_IDS.p1,  created_at: daysAgo(3) },
  { id: 'k1000000-0000-0000-0000-000000000003', user_id: USER_IDS.ananya, post_id: POST_IDS.p5,  created_at: daysAgo(1) },
  { id: 'k1000000-0000-0000-0000-000000000004', user_id: USER_IDS.rahul,  post_id: POST_IDS.p4,  created_at: daysAgo(2) },
  { id: 'k1000000-0000-0000-0000-000000000005', user_id: USER_IDS.meera,  post_id: POST_IDS.p9,  created_at: daysAgo(11) },
  { id: 'k1000000-0000-0000-0000-000000000006', user_id: USER_IDS.priya,  post_id: POST_IDS.p9,  created_at: daysAgo(10) },
  { id: 'k1000000-0000-0000-0000-000000000007', user_id: USER_IDS.vikram, post_id: POST_IDS.p10, created_at: daysAgo(0) },
  { id: 'k1000000-0000-0000-0000-000000000008', user_id: USER_IDS.arjun,  post_id: POST_IDS.p4,  created_at: daysAgo(2) },
]

// ============================================================================
// PART 13 — FOLLOWS (generated)
//
// Deterministically generate follow relationships between the mock profiles
// so each user follows 1–3 other users. Uses a small seeded RNG so output is
// stable across runs but looks random.
// ============================================================================

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const _rand = mulberry32(42)
const profileIds = mockProfiles.map(p => p.id)
let followCounter = 1
const generatedFollows: Tables<'follows'>[] = []

for (const followerId of profileIds) {
  const followCount = Math.floor(_rand() * 3) + 1 // 1..3
  // shuffle deterministically
  const shuffled = profileIds
    .filter(id => id !== followerId)
    .sort(() => (_rand() > 0.5 ? 1 : -1))

  const targets = shuffled.slice(0, followCount)
  for (const targetId of targets) {
    const idSuffix = String(followCounter).padStart(3, '0')
    generatedFollows.push({
      id: `l1000000-0000-0000-0000-000000000${idSuffix}`,
      follower_id: followerId,
      following_id: targetId,
      created_at: daysAgo(Math.floor(_rand() * 365)),
    })
    followCounter++
  }
}

const mockFollows: Tables<'follows'>[] = generatedFollows

// ============================================================================
// PART 14 — IMPACT CIRCLES (3)
// ============================================================================

const mockImpactCircles: Tables<'impact_circles'>[] = [
  {
    id: CIRCLE_IDS.green,
    name: 'Hyderabad Green Warriors',
    description: 'A community of environmental activists dedicated to making Hyderabad greener. We organise monthly tree plantation drives, lake cleanup campaigns, and native plant awareness events.',
    avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=GreenWarriors',
    principal_id: USER_IDS.arjun,
    locality_name: 'Hyderabad',
    location: LOCATIONS.hyderabad,
    member_count: 24,
    eminence_score: 4200,
    min_badge_required: 'Bronze',
    is_active: true,
    created_at: daysAgo(300),
    updated_at: daysAgo(5),
  },
  {
    id: CIRCLE_IDS.blood,
    name: 'AP Blood Donation Network',
    description: 'Coordinating blood donation camps across Andhra Pradesh and Telangana. We connect donors with hospitals in need and organise regular donation drives in all major cities.',
    avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=BloodNetwork',
    principal_id: USER_IDS.priya,
    locality_name: 'Hyderabad',
    location: LOCATIONS.hyderabad,
    member_count: 15,
    eminence_score: 1800,
    min_badge_required: 'Citizen',
    is_active: true,
    created_at: daysAgo(280),
    updated_at: daysAgo(7),
  },
  {
    id: CIRCLE_IDS.clean,
    name: 'Clean Hyderabad Initiative',
    description: 'Citizens taking ownership of their neighbourhoods. Weekly cleanup drives, waste segregation workshops, and plastic reduction campaigns across all parts of Hyderabad.',
    avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=CleanHyderabad',
    principal_id: USER_IDS.kiran,
    locality_name: 'Hyderabad',
    location: LOCATIONS.hyderabad,
    member_count: 31,
    eminence_score: 2900,
    min_badge_required: 'Citizen',
    is_active: true,
    created_at: daysAgo(85),
    updated_at: daysAgo(2),
  },
]

// ============================================================================
// PART 15 — IMPACT CIRCLE MEMBERS (8)
// ============================================================================

const mockImpactCircleMembers: Tables<'impact_circle_members'>[] = [
  // Green circle
  {
    id: 'm1000000-0000-0000-0000-000000000001',
    circle_id: CIRCLE_IDS.green,
    user_id: USER_IDS.arjun,
    role: 'principal',
    ready_to_serve: true,
    joined_at: daysAgo(300),
  },
  {
    id: 'm1000000-0000-0000-0000-000000000002',
    circle_id: CIRCLE_IDS.green,
    user_id: USER_IDS.rahul,
    role: 'steward',
    ready_to_serve: true,
    joined_at: daysAgo(250),
  },
  {
    id: 'm1000000-0000-0000-0000-000000000003',
    circle_id: CIRCLE_IDS.green,
    user_id: USER_IDS.meera,
    role: 'member',
    ready_to_serve: false,
    joined_at: daysAgo(200),
  },
  // Blood circle
  {
    id: 'm1000000-0000-0000-0000-000000000004',
    circle_id: CIRCLE_IDS.blood,
    user_id: USER_IDS.priya,
    role: 'principal',
    ready_to_serve: true,
    joined_at: daysAgo(280),
  },
  {
    id: 'm1000000-0000-0000-0000-000000000005',
    circle_id: CIRCLE_IDS.blood,
    user_id: USER_IDS.vikram,
    role: 'steward',
    ready_to_serve: true,
    joined_at: daysAgo(180),
  },
  // Clean circle
  {
    id: 'm1000000-0000-0000-0000-000000000006',
    circle_id: CIRCLE_IDS.clean,
    user_id: USER_IDS.kiran,
    role: 'principal',
    ready_to_serve: true,
    joined_at: daysAgo(85),
  },
  {
    id: 'm1000000-0000-0000-0000-000000000007',
    circle_id: CIRCLE_IDS.clean,
    user_id: USER_IDS.ananya,
    role: 'steward',
    ready_to_serve: true,
    joined_at: daysAgo(80),
  },
  {
    id: 'm1000000-0000-0000-0000-000000000008',
    circle_id: CIRCLE_IDS.clean,
    user_id: USER_IDS.dev,
    role: 'member',
    ready_to_serve: false,
    joined_at: daysAgo(60),
  },
]

interface ImpactCircleRosterMember {
  id: string
  displayName: string
  rank: string
  isActive: boolean
}

interface ImpactCircleChatMessage {
  id: string
  author: string
  authorRank: string
  content: string
  timestamp: string
  isMine?: boolean
}

interface ImpactCircleStandingEntry {
  id: string
  user_id: string
  rank: number
  displayName: string
  avatar_url?: string
  badge: string
  weeklyPoints: number
  isActive: boolean
}

const mockImpactCircleChats: Record<string, { roster: ImpactCircleRosterMember[]; messages: ImpactCircleChatMessage[] }> = {
  [CIRCLE_IDS.green]: {
    roster: [
      { id: USER_IDS.arjun, displayName: 'Arjun', rank: 'Principal', isActive: true },
      { id: USER_IDS.priya, displayName: 'Priya', rank: 'Steward', isActive: true },
      { id: USER_IDS.rahul, displayName: 'Rahul', rank: 'Member', isActive: false },
      { id: USER_IDS.meera, displayName: 'Meera', rank: 'Member', isActive: true },
      { id: USER_IDS.vikram, displayName: 'Vikram', rank: 'Member', isActive: false },
    ],
    messages: [
      {
        id: 'cg1',
        author: 'Priya',
        authorRank: 'Steward',
        content: 'The tree plantation drive is confirmed for Saturday. Can everyone bring saplings?',
        timestamp: '10:34 AM',
      },
      {
        id: 'cg2',
        author: 'Arjun',
        authorRank: 'Principal',
        content: 'Great. I will arrange the posters and local notifications.',
        timestamp: '10:36 AM',
        isMine: true,
      },
      {
        id: 'cg3',
        author: 'Rahul',
        authorRank: 'Member',
        content: 'I can share the event with the neighbourhood committee as well.',
        timestamp: '10:42 AM',
      },
    ],
  },
  [CIRCLE_IDS.blood]: {
    roster: [
      { id: USER_IDS.priya, displayName: 'Priya', rank: 'Principal', isActive: true },
      { id: USER_IDS.vikram, displayName: 'Vikram', rank: 'Steward', isActive: true },
      { id: USER_IDS.arjun, displayName: 'Arjun', rank: 'Member', isActive: false },
    ],
    messages: [
      {
        id: 'cb1',
        author: 'Vikram',
        authorRank: 'Steward',
        content: 'Hospital outreach planning is underway. We need at least 10 volunteers for the blood camp.',
        timestamp: '9:20 AM',
      },
      {
        id: 'cb2',
        author: 'Priya',
        authorRank: 'Principal',
        content: 'Please confirm availability by tomorrow evening.',
        timestamp: '9:25 AM',
      },
      {
        id: 'cb3',
        author: 'Arjun',
        authorRank: 'Member',
        content: 'I can help with donor registration and transport coordination.',
        timestamp: '9:30 AM',
        isMine: true,
      },
    ],
  },
  [CIRCLE_IDS.clean]: {
    roster: [
      { id: USER_IDS.kiran, displayName: 'Kiran', rank: 'Principal', isActive: true },
      { id: USER_IDS.ananya, displayName: 'Ananya', rank: 'Steward', isActive: true },
      { id: USER_IDS.dev, displayName: 'Dev', rank: 'Member', isActive: false },
    ],
    messages: [
      {
        id: 'cc1',
        author: 'Kiran',
        authorRank: 'Principal',
        content: 'The next cleanup route is the Old City market area. Let’s meet at 7am.',
        timestamp: '8:55 AM',
      },
      {
        id: 'cc2',
        author: 'Ananya',
        authorRank: 'Steward',
        content: 'I have gloves and bags ready for the team.',
        timestamp: '8:58 AM',
      },
      {
        id: 'cc3',
        author: 'Dev',
        authorRank: 'Member',
        content: 'I will lead the waste segregation briefing after the cleanup.',
        timestamp: '9:05 AM',
        isMine: true,
      },
    ],
  },
}

const mockImpactCircleStandings: Record<string, ImpactCircleStandingEntry[]> = {
  [CIRCLE_IDS.green]: [
    { id: 's-g-1', user_id: USER_IDS.arjun,  rank: 1, displayName: 'Arjun',  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ArjunMehta',    badge: 'Gold',    weeklyPoints: 620, isActive: true  },
    { id: 's-g-2', user_id: USER_IDS.priya,  rank: 2, displayName: 'Priya',  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PriyaVenkatesh', badge: 'Gold',    weeklyPoints: 590, isActive: true  },
    { id: 's-g-3', user_id: USER_IDS.rahul,  rank: 3, displayName: 'Rahul',  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=RahulSharma',    badge: 'Silver',  weeklyPoints: 540, isActive: false },
    { id: 's-g-4', user_id: USER_IDS.meera,  rank: 4, displayName: 'Meera',  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MeeraIyer',      badge: 'Silver',  weeklyPoints: 500, isActive: true  },
    { id: 's-g-5', user_id: USER_IDS.vikram, rank: 5, displayName: 'Vikram', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VikramNair',     badge: 'Bronze',  weeklyPoints: 470, isActive: false },
  ],
  [CIRCLE_IDS.blood]: [
    { id: 's-b-1', user_id: USER_IDS.arjun,  rank: 1, displayName: 'Arjun',  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ArjunMehta',    badge: 'Gold',   weeklyPoints: 720, isActive: false },
    { id: 's-b-2', user_id: USER_IDS.priya,  rank: 2, displayName: 'Priya',  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PriyaVenkatesh', badge: 'Gold',   weeklyPoints: 680, isActive: true  },
    { id: 's-b-3', user_id: USER_IDS.vikram, rank: 3, displayName: 'Vikram', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VikramNair',     badge: 'Bronze', weeklyPoints: 640, isActive: true  },
  ],
  [CIRCLE_IDS.clean]: [
    { id: 's-c-1', user_id: USER_IDS.ananya, rank: 1, displayName: 'Ananya', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AnanyaGupta',   badge: 'Bronze',  weeklyPoints: 800, isActive: true  },
    { id: 's-c-2', user_id: USER_IDS.kiran,  rank: 2, displayName: 'Kiran',  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=KiranReddy',    badge: 'Citizen', weeklyPoints: 770, isActive: true  },
    { id: 's-c-3', user_id: USER_IDS.dev,    rank: 3, displayName: 'Dev',    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DevPillai',     badge: 'Citizen', weeklyPoints: 730, isActive: false },
  ],
}

// ============================================================================
// PART 16 — CIRCLE MESSAGES (9, 3 per circle — DB-layer shape)
// These match the circle_messages table defined in migration 002.
// API routes join these with mockProfiles to produce the presentation shape.
// ============================================================================

export interface MockCircleMessage {
  id: string
  circle_id: string
  author_id: string
  content: string
  created_at: string
}

const mockCircleMessages: MockCircleMessage[] = [
  // Hyderabad Green Warriors
  {
    id: 'msg-g-1',
    circle_id: CIRCLE_IDS.green,
    author_id: USER_IDS.priya,
    content: 'The tree plantation drive is confirmed for Saturday. Can everyone bring saplings?',
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-g-2',
    circle_id: CIRCLE_IDS.green,
    author_id: USER_IDS.arjun,
    content: 'Great. I will arrange the posters and local notifications.',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-g-3',
    circle_id: CIRCLE_IDS.green,
    author_id: USER_IDS.rahul,
    content: 'I can share the event with the neighbourhood committee as well.',
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  // AP Blood Donation Network
  {
    id: 'msg-b-1',
    circle_id: CIRCLE_IDS.blood,
    author_id: USER_IDS.vikram,
    content: 'Hospital outreach planning is underway. We need at least 10 volunteers for the blood camp.',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-b-2',
    circle_id: CIRCLE_IDS.blood,
    author_id: USER_IDS.priya,
    content: 'Please confirm availability by tomorrow evening.',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-b-3',
    circle_id: CIRCLE_IDS.blood,
    author_id: USER_IDS.arjun,
    content: 'I can help with donor registration and transport coordination.',
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  // Clean Hyderabad Initiative
  {
    id: 'msg-c-1',
    circle_id: CIRCLE_IDS.clean,
    author_id: USER_IDS.kiran,
    content: 'The next cleanup route is the Old City market area. Let\'s meet at 7am.',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-c-2',
    circle_id: CIRCLE_IDS.clean,
    author_id: USER_IDS.ananya,
    content: 'I have gloves and bags ready for the team.',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-c-3',
    circle_id: CIRCLE_IDS.clean,
    author_id: USER_IDS.dev,
    content: 'I will lead the waste segregation briefing after the cleanup.',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
]

// ============================================================================
// PART 17 — NOTIFICATIONS (6)
// ============================================================================

const mockNotifications: Tables<'notifications'>[] = [
  // For kiran
  {
    id: 'n1000000-0000-0000-0000-000000000001',
    user_id: USER_IDS.kiran,
    type: 'vouch',
    title: 'Arjun Mehta vouched your post',
    message: 'Your tree plantation post received a vouch.',
    is_read: false,
    related_user_id: USER_IDS.arjun,
    related_post_id: POST_IDS.p7,
    related_challenge_id: null,
    related_circle_id: null,
    created_at: daysAgo(1),
  },
  {
    id: 'n1000000-0000-0000-0000-000000000002',
    user_id: USER_IDS.kiran,
    type: 'follow',
    title: 'Priya Venkatesh started believing in you',
    message: 'You have a new believer!',
    is_read: false,
    related_user_id: USER_IDS.priya,
    related_post_id: null,
    related_challenge_id: null,
    related_circle_id: null,
    created_at: daysAgo(2),
  },
  {
    id: 'n1000000-0000-0000-0000-000000000003',
    user_id: USER_IDS.kiran,
    type: 'challenge_verified',
    title: 'Your submission has been verified!',
    message: 'Your submission to Plant 10 Trees has been verified! +200 Standing',
    is_read: true,
    related_user_id: null,
    related_post_id: null,
    related_challenge_id: CHALLENGE_IDS.c1,
    related_circle_id: null,
    created_at: daysAgo(5),
  },
  // For dev
  {
    id: 'n1000000-0000-0000-0000-000000000004',
    user_id: USER_IDS.dev,
    type: 'comment',
    title: 'Arjun Mehta replied to your comment',
    message: 'Check out the reply on your comment about neem saplings.',
    is_read: false,
    related_user_id: USER_IDS.arjun,
    related_post_id: POST_IDS.p9,
    related_challenge_id: null,
    related_circle_id: null,
    created_at: daysAgo(10),
  },
  {
    id: 'n1000000-0000-0000-0000-000000000005',
    user_id: USER_IDS.dev,
    type: 'system',
    title: 'Welcome to Imphere!',
    message: 'Complete your first challenge to earn Standing points.',
    is_read: true,
    related_user_id: null,
    related_post_id: null,
    related_challenge_id: null,
    related_circle_id: null,
    created_at: daysAgo(75),
  },
  // For priya
  {
    id: 'n1000000-0000-0000-0000-000000000006',
    user_id: USER_IDS.priya,
    type: 'ic_credited',
    title: '50 Impact Credits added',
    message: '50 Impact Credits added to your account from AP Blood Donation Network circle.',
    is_read: false,
    related_user_id: null,
    related_post_id: null,
    related_challenge_id: null,
    related_circle_id: CIRCLE_IDS.blood,
    created_at: daysAgo(3),
  },
]

// ============================================================================
// PART 18 — VOUCHERS (4)
// ============================================================================

const mockVouchers: Tables<'vouchers'>[] = [
  {
    id: VOUCHER_IDS.v1,
    title: '20% Off at Decathlon India',
    description: 'Valid on all outdoor and sports equipment. Use at any Decathlon store across India or online.',
    image_url: 'https://picsum.photos/seed/decathlon/400/300',
    merchant_name: 'Decathlon India',
    ic_cost: 200,
    value_description: '20% off on purchases above ₹2000',
    encrypted_code: 'MOCK_CODE_v1',
    is_active: true,
    is_redeemed: false,
    redeemed_by: null,
    redeemed_at: null,
    expires_at: daysFromNow(90),
    created_at: daysAgo(30),
  },
  {
    id: VOUCHER_IDS.v2,
    title: 'Free Product from Organic India',
    description: 'Redeem for any single product from the Organic India range up to ₹500 value. Valid online and in stores.',
    image_url: 'https://picsum.photos/seed/organic/400/300',
    merchant_name: 'Organic India',
    ic_cost: 150,
    value_description: 'Free product up to ₹500',
    encrypted_code: 'MOCK_CODE_v2',
    is_active: true,
    is_redeemed: false,
    redeemed_by: null,
    redeemed_at: null,
    expires_at: daysFromNow(60),
    created_at: daysAgo(20),
  },
  {
    id: VOUCHER_IDS.v3,
    title: '15% Off at The Body Shop India',
    description: 'Valid on all natural and cruelty-free skincare products.',
    image_url: 'https://picsum.photos/seed/bodyshop/400/300',
    merchant_name: 'The Body Shop India',
    ic_cost: 100,
    value_description: '15% off entire purchase',
    encrypted_code: 'MOCK_CODE_v3',
    is_active: true,
    is_redeemed: true,
    redeemed_by: USER_IDS.meera,
    redeemed_at: daysAgo(10),
    expires_at: daysFromNow(30),
    created_at: daysAgo(45),
  },
  {
    id: VOUCHER_IDS.v4,
    title: '₹300 Off at Bombay Shaving Company',
    description: 'Natural grooming products made sustainably in India. ₹300 off on orders above ₹1500.',
    image_url: 'https://picsum.photos/seed/bsc/400/300',
    merchant_name: 'Bombay Shaving Company',
    ic_cost: 80,
    value_description: '₹300 off on orders above ₹1500',
    encrypted_code: 'MOCK_CODE_v4',
    is_active: true,
    is_redeemed: false,
    redeemed_by: null,
    redeemed_at: null,
    expires_at: daysFromNow(45),
    created_at: daysAgo(15),
  },
]

// ============================================================================
// PART 19 — TRANSACTIONS (8)
// ============================================================================

const mockTransactions: Tables<'transactions'>[] = [
  // Arjun's transactions
  {
    id: 'o1000000-0000-0000-0000-000000000001',
    user_id: USER_IDS.arjun,
    type: 'standing_earned',
    amount: 200,
    balance_after: 11040,
    description: 'Challenge completed: Plant 10 Trees in Your Locality',
    related_challenge_id: CHALLENGE_IDS.c1,
    related_submission_id: SUBMISSION_IDS.s1,
    related_voucher_id: null,
    created_at: daysAgo(5),
  },
  {
    id: 'o1000000-0000-0000-0000-000000000002',
    user_id: USER_IDS.arjun,
    type: 'ic_earned',
    amount: 50,
    balance_after: 1800,
    description: 'Impact Credits earned from Plant 10 Trees challenge',
    related_challenge_id: CHALLENGE_IDS.c1,
    related_submission_id: SUBMISSION_IDS.s1,
    related_voucher_id: null,
    created_at: daysAgo(5),
  },
  {
    id: 'o1000000-0000-0000-0000-000000000003',
    user_id: USER_IDS.arjun,
    type: 'standing_earned',
    amount: 150,
    balance_after: 11190,
    description: 'Bonus standing for organising tree planting drive',
    related_challenge_id: null,
    related_submission_id: null,
    related_voucher_id: null,
    created_at: daysAgo(15),
  },
  {
    id: 'o1000000-0000-0000-0000-000000000004',
    user_id: USER_IDS.arjun,
    type: 'ic_spent',
    amount: 100,
    balance_after: 1750,
    description: 'Voucher exchange: 20% Off at Decathlon India',
    related_challenge_id: null,
    related_submission_id: null,
    related_voucher_id: VOUCHER_IDS.v1,
    created_at: daysAgo(25),
  },
  // Priya's transactions
  {
    id: 'o1000000-0000-0000-0000-000000000005',
    user_id: USER_IDS.priya,
    type: 'standing_earned',
    amount: 300,
    balance_after: 8450,
    description: 'Challenge completed: Organise a Blood Donation Camp',
    related_challenge_id: CHALLENGE_IDS.c2,
    related_submission_id: SUBMISSION_IDS.s2,
    related_voucher_id: null,
    created_at: daysAgo(7),
  },
  {
    id: 'o1000000-0000-0000-0000-000000000006',
    user_id: USER_IDS.priya,
    type: 'ic_earned',
    amount: 80,
    balance_after: 1340,
    description: 'Impact Credits earned from Blood Donation Camp challenge',
    related_challenge_id: CHALLENGE_IDS.c2,
    related_submission_id: SUBMISSION_IDS.s2,
    related_voucher_id: null,
    created_at: daysAgo(7),
  },
  // Kiran's transaction
  {
    id: 'o1000000-0000-0000-0000-000000000007',
    user_id: USER_IDS.kiran,
    type: 'standing_earned',
    amount: 200,
    balance_after: 340,
    description: 'Challenge verified: Plant 10 Trees in Your Locality',
    related_challenge_id: CHALLENGE_IDS.c1,
    related_submission_id: SUBMISSION_IDS.s4,
    related_voucher_id: null,
    created_at: daysAgo(2),
  },
  // Meera's transaction
  {
    id: 'o1000000-0000-0000-0000-000000000008',
    user_id: USER_IDS.meera,
    type: 'ic_spent',
    amount: 100,
    balance_after: 410,
    description: 'Voucher redeemed: 15% Off at The Body Shop India',
    related_challenge_id: null,
    related_submission_id: null,
    related_voucher_id: VOUCHER_IDS.v3,
    created_at: daysAgo(10),
  },
]

// ============================================================================
// EXPORTS
// ============================================================================

export const mockData = {
  profiles:             mockProfiles,
  posts:                mockPosts,
  challenges:           mockChallenges,
  challengeCategories:  mockChallengeCategories,
  challengeSubmissions: mockChallengeSubmissions,
  challengeBackers:     mockChallengeBackers,
  comments:             mockComments,
  vouches:              mockVouches,
  saves:                mockSaves,
  follows:              mockFollows,
  impactCircles:         mockImpactCircles,
  impactCircleMembers:   mockImpactCircleMembers,
  impactCircleChats:     mockImpactCircleChats,
  impactCircleStandings: mockImpactCircleStandings,
  circleMessages:        mockCircleMessages,
  notifications:        mockNotifications,
  vouchers:             mockVouchers,
  transactions:         mockTransactions,
} as const

export {
  USER_IDS,
  CATEGORY_IDS,
  CHALLENGE_IDS,
  POST_IDS,
  CIRCLE_IDS,
  SUBMISSION_IDS,
  COMMENT_IDS,
  VOUCHER_IDS,
  mockImpactCircleChats,
  mockImpactCircleStandings,
  mockCircleMessages,
}

export type MockData = typeof mockData
