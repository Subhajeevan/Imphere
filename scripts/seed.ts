import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { mockData } from '../src/lib/mock-data'

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env')
  process.exit(1)
}

// Create a Supabase admin client to bypass RLS and manage auth users
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper to convert mock full name emails to simplified login emails (e.g. arjun@imphere.app)
function getSimpleEmail(email: string): string {
  const prefix = email.split('@')[0]
  const name = prefix.split('.')[0]
  return `${name}@imphere.app`
}

// Password mapping for seed users to keep them deterministic and easy to log in
const PASSWORD_MAP: Record<string, string> = {
  'arjun@imphere.app': 'Arjun@123',
  'priya@imphere.app': 'Priya@123',
  'rahul@imphere.app': 'Rahul@123',
  'meera@imphere.app': 'Meera@123',
  'vikram@imphere.app': 'Vikram@123',
  'ananya@imphere.app': 'Ananya@123',
  'kiran@imphere.app': 'Kiran@123',
  'dev@imphere.app': 'Dev@12345'
}

// Helper to convert GeoJSON Point coordinates to PostGIS POINT string for PostgREST ingestion
function toGeometryString(geo: any) {
  if (!geo) return null
  if (typeof geo === 'string') return geo
  if (geo.coordinates && Array.isArray(geo.coordinates)) {
    const [lng, lat] = geo.coordinates
    return `POINT(${lng} ${lat})`
  }
  return null
}

// Helper to sanitize non-hex characters in mock UUID string (e.g., 'g', 'h', 'i', etc.) to make them standard PostgreSQL UUID compliant
function makeUuidValid(str: string): string {
  if (typeof str !== 'string' || str.length !== 36) return str
  return str.toLowerCase().replace(/[^0-9a-f-]/g, (char) => {
    const mapping: Record<string, string> = {
      'g': '9', 'h': '8', 'i': 'a', 'j': 'b', 'k': 'c', 'l': 'd', 'm': 'e', 'n': 'f', 'o': '1'
    }
    return mapping[char] || '0'
  })
}

// Recursive helper to traverse any data structure, replace mock User IDs, and sanitize other UUID strings
function replaceUserIds(obj: any, idMap: Record<string, string>): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') {
    // First map the User ID if it matches
    const mapped = idMap[obj] || obj
    // Sanitize the UUID string to be valid hex compliant
    return makeUuidValid(mapped)
  }
  if (Array.isArray(obj)) {
    return obj.map(item => replaceUserIds(item, idMap))
  }
  if (typeof obj === 'object') {
    const newObj: any = {}
    for (const key of Object.keys(obj)) {
      newObj[key] = replaceUserIds(obj[key], idMap)
    }
    return newObj
  }
  return obj
}

async function runSeed() {
  console.log('🚀 Starting Imphere Supabase Seeding Script...')

  // ==========================================
  // PART 1 — CLEAN EXISTING DATA IDEMPOTENTLY
  // ==========================================
  console.log('\n🧹 Cleaning existing database records...')

  const tablesToClean = [
    'transactions',
    'notifications',
    'vouchers',
    'impact_circle_members',
    'impact_circles',
    'saves',
    'comments',
    'vouches',
    'posts',
    'challenge_submissions',
    'challenge_backers',
    'challenges',
    'challenge_categories',
    'follows',
    'profiles'
  ]

  for (const table of tablesToClean) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) {
      console.warn(`⚠️ Warning cleaning table ${table}:`, error.message)
    } else {
      console.log(`✅ Cleaned table ${table}`)
    }
  }

  // ==========================================
  // PART 2 — CLEAN & RECREATE AUTH USERS
  // ==========================================
  console.log('\n👤 Provisioning Auth Users...')

  // Fetch all existing users from Supabase Auth
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
    perPage: 1000
  })

  if (listError) {
    console.error('❌ Failed to retrieve auth users:', listError.message)
    process.exit(1)
  }

  const emailsToRecreate = Object.keys(PASSWORD_MAP)
  const seedMockUserIds = mockData.profiles.map(p => p.id)

  // Delete any existing auth users matching seed emails or deterministic seed user IDs
  for (const u of users) {
    const isSeedUser = seedMockUserIds.includes(u.id) || 
                       (u.email && (emailsToRecreate.includes(u.email) || emailsToRecreate.includes(getSimpleEmail(u.email))))
    if (isSeedUser) {
      console.log(`Deleting existing auth user: ${u.email || u.id}`)
      const { error } = await supabase.auth.admin.deleteUser(u.id)
      if (error) {
        console.error(`❌ Failed to delete auth user ${u.email || u.id}:`, error.message)
      }
    }
  }

  const idMap: Record<string, string> = {}

  // Create real, loginnable Auth Users using Supabase-generated IDs, storing the mapping to mock IDs
  for (const profile of mockData.profiles) {
    const simpleEmail = getSimpleEmail(profile.email)
    const password = PASSWORD_MAP[simpleEmail] || 'Imphere@123'
    console.log(`Creating auth user: ${simpleEmail} (${profile.display_name})`)

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: simpleEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: profile.display_name,
        avatar_url: profile.avatar_url
      }
    })

    if (authError) {
      console.error(`❌ Failed to create auth user ${simpleEmail}:`, authError.message)
      process.exit(1)
    }
    
    // Save the ID mapping
    idMap[profile.id] = authUser.user.id
    console.log(`  └─ Created auth user ID: ${authUser.user.id} (mapped from ${profile.id})`)
  }

  // ==========================================
  // PART 3 — UPDATE AND SYNC PROFILES
  // ==========================================
  console.log('\n🗂️ Syncing user profiles...')

  // Apply ID mapping and sanitization recursively on the mock profiles array
  const mappedProfiles = replaceUserIds(mockData.profiles, idMap)

  // When auth.users rows were created, handle_new_user() trigger auto-inserted rows in profiles.
  // We upsert profiles here to enrich them with full standing, badges, and spatial points.
  for (const profile of mappedProfiles) {
    console.log(`Syncing profile: ${profile.display_name}`)
    
    const profileToUpsert = {
      ...profile,
      email: getSimpleEmail(profile.email), // Sync with simple login email
      native_pin_location: toGeometryString(profile.native_pin_location),
      active_location: toGeometryString(profile.active_location),
      onboarding_status: 'active' as const
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileToUpsert)

    if (profileError) {
      console.error(`❌ Failed to sync profile ${profile.display_name}:`, profileError.message)
      process.exit(1)
    }
  }
  console.log('✅ All profiles synchronized successfully')

  // ==========================================
  // PART 4 — SEED CATEGORIES & CHALLENGES
  // ==========================================
  console.log('\n🏷️ Seeding categories and challenges...')

  const categories = replaceUserIds(mockData.challengeCategories, idMap)

  const { error: catError } = await supabase
    .from('challenge_categories')
    .insert(categories)

  if (catError) {
    console.error('❌ Failed to seed challenge categories:', catError.message)
    process.exit(1)
  }
  console.log(`✅ Seeded ${categories.length} challenge categories`)

  const challenges = replaceUserIds(mockData.challenges, idMap).map((c: any) => ({
    ...c,
    location: toGeometryString(c.location)
  }))

  const { error: chalError } = await supabase
    .from('challenges')
    .insert(challenges)

  if (chalError) {
    console.error('❌ Failed to seed challenges:', chalError.message)
    process.exit(1)
  }
  console.log(`✅ Seeded ${challenges.length} challenges`)

  // ==========================================
  // PART 5 — SEED SUBMISSIONS & POSTS
  // ==========================================
  console.log('\n📸 Seeding submissions and feed posts...')

  const submissions = replaceUserIds(mockData.challengeSubmissions, idMap).map((s: any) => ({
    ...s,
    claimed_location: toGeometryString(s.claimed_location),
    exif_location: toGeometryString(s.exif_location)
  }))

  const { error: subError } = await supabase
    .from('challenge_submissions')
    .insert(submissions)

  if (subError) {
    console.error('❌ Failed to seed challenge submissions:', subError.message)
    process.exit(1)
  }
  console.log(`✅ Seeded ${submissions.length} challenge submissions`)

  const posts = replaceUserIds(mockData.posts, idMap).map((p: any) => ({
    ...p,
    location: toGeometryString(p.location)
  }))

  const { error: postError } = await supabase
    .from('posts')
    .insert(posts)

  if (postError) {
    console.error('❌ Failed to seed posts:', postError.message)
    process.exit(1)
  }
  console.log(`✅ Seeded ${posts.length} feed posts`)

  // ==========================================
  // PART 6 — SEED RELATIONS (VOUCHES, COMMENTS, SAVES, FOLLOWS)
  // ==========================================
  console.log('\n🔗 Seeding relationships and user interactions...')

  const follows = replaceUserIds(mockData.follows, idMap)
  if (follows.length > 0) {
    const { error: followError } = await supabase.from('follows').insert(follows)
    if (followError) console.error('❌ Follows insert error:', followError.message)
    else console.log(`✅ Seeded ${follows.length} followers/following links`)
  }

  const vouches = replaceUserIds(mockData.vouches, idMap)
  if (vouches.length > 0) {
    const { error: vouchError } = await supabase.from('vouches').insert(vouches)
    if (vouchError) console.error('❌ Vouches insert error:', vouchError.message)
    else console.log(`✅ Seeded ${vouches.length} post vouches`)
  }

  const comments = replaceUserIds(mockData.comments, idMap)
  if (comments.length > 0) {
    const { error: commentError } = await supabase.from('comments').insert(comments)
    if (commentError) console.error('❌ Comments insert error:', commentError.message)
    else console.log(`✅ Seeded ${comments.length} comments`)
  }

  const saves = replaceUserIds(mockData.saves, idMap)
  if (saves.length > 0) {
    const { error: saveError } = await supabase.from('saves').insert(saves)
    if (saveError) console.error('❌ Saves insert error:', saveError.message)
    else console.log(`✅ Seeded ${saves.length} saved bookmarks`)
  }

  const backers = replaceUserIds(mockData.challengeBackers, idMap)
  if (backers.length > 0) {
    const { error: backerError } = await supabase.from('challenge_backers').insert(backers)
    if (backerError) console.error('❌ Backers insert error:', backerError.message)
    else console.log(`✅ Seeded ${backers.length} proclamation backers`)
  }

  // ==========================================
  // PART 7 — SEED IMPACT CIRCLES
  // ==========================================
  console.log('\n🟢 Seeding impact circles...')

  const circles = replaceUserIds(mockData.impactCircles, idMap).map((cir: any) => ({
    ...cir,
    location: toGeometryString(cir.location)
  }))

  const { error: circleError } = await supabase
    .from('impact_circles')
    .insert(circles)

  if (circleError) {
    console.error('❌ Failed to seed impact circles:', circleError.message)
    process.exit(1)
  }
  console.log(`✅ Seeded ${circles.length} impact circles`)

  const members = replaceUserIds(mockData.impactCircleMembers, idMap)
  if (members.length > 0) {
    const { error: memberError } = await supabase.from('impact_circle_members').insert(members)
    if (memberError) console.error('❌ Circle members insert error:', memberError.message)
    else console.log(`✅ Seeded ${members.length} circle members`)
  }

  // ==========================================
  // PART 8 — SEED NOTIFICATIONS, VOUCHERS, TRANSACTIONS
  // ==========================================
  console.log('\n📜 Seeding system actions (vouchers, notifications, audit log)...')

  const vouchers = replaceUserIds(mockData.vouchers, idMap)
  if (vouchers.length > 0) {
    const { error: voucherError } = await supabase.from('vouchers').insert(vouchers)
    if (voucherError) console.error('❌ Vouchers insert error:', voucherError.message)
    else console.log(`✅ Seeded ${vouchers.length} reward store vouchers`)
  }

  const notifications = replaceUserIds(mockData.notifications, idMap)
  if (notifications.length > 0) {
    const { error: notifError } = await supabase.from('notifications').insert(notifications)
    if (notifError) console.error('❌ Notifications insert error:', notifError.message)
    else console.log(`✅ Seeded ${notifications.length} notifications`)
  }

  const transactions = replaceUserIds(mockData.transactions, idMap)
  if (transactions.length > 0) {
    const { error: txError } = await supabase.from('transactions').insert(transactions)
    if (txError) console.error('❌ Transactions insert error:', txError.message)
    else console.log(`✅ Seeded ${transactions.length} audit ledger transactions`)
  }

  console.log('\n🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!')
  console.log('===================================================')
  console.log('You can now log in to the application using:')
  console.log('Username (email): [any catalyst email, e.g. arjun@imphere.app]')
  console.log('Password: [e.g. Arjun@123]')
  console.log('===================================================')
}

runSeed().catch(err => {
  console.error('❌ Seeding process encountered a fatal error:', err)
  process.exit(1)
})
