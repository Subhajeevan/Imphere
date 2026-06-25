-- ============================================================================
-- Migration 004: Exchange Marketplace
-- Run in Supabase SQL Editor after 001, 002, 003
-- ============================================================================

-- ============================================================================
-- 1. exchange_products — Product/reward catalogue
-- ============================================================================

CREATE TABLE IF NOT EXISTS exchange_products (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  description      TEXT        NOT NULL DEFAULT '',
  emoji            TEXT        NOT NULL DEFAULT '🎁',
  bg_color         TEXT        NOT NULL DEFAULT 'bg-amber-50',
  brand_name       TEXT        NOT NULL,
  points_cost      INTEGER     NOT NULL CHECK (points_cost > 0),
  real_price       INTEGER     NOT NULL CHECK (real_price >= 0),
  discount_percent INTEGER     NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  category         TEXT        NOT NULL DEFAULT 'gift-cards'
                               CONSTRAINT exchange_products_category_check
                               CHECK (category IN (
                                 'eco','electronics','gift-cards','food','travel',
                                 'health','learning','fitness','plants','fashion',
                                 'events','digital','donations','local','exclusive'
                               )),
  stock            INTEGER     NOT NULL DEFAULT 0 CHECK (stock >= 0),
  total_stock      INTEGER     NOT NULL DEFAULT 0 CHECK (total_stock >= 0),
  is_sponsored     BOOLEAN     DEFAULT FALSE,
  sponsor_name     TEXT,
  is_trending      BOOLEAN     DEFAULT FALSE,
  is_limited       BOOLEAN     DEFAULT FALSE,
  is_new           BOOLEAN     DEFAULT FALSE,
  is_featured      BOOLEAN     DEFAULT FALSE,
  is_leaderboard   BOOLEAN     DEFAULT FALSE,
  is_daily_deal    BOOLEAN     DEFAULT FALSE,
  deal_ends_at     TIMESTAMPTZ,
  deal_claimed     INTEGER     DEFAULT 0,
  deal_total       INTEGER     DEFAULT 0,
  rating           NUMERIC(3,1) DEFAULT 4.5 CHECK (rating BETWEEN 0 AND 5),
  reviews_count    INTEGER     DEFAULT 0,
  expires_at       TIMESTAMPTZ,
  delivery_days    INTEGER     DEFAULT 0,
  tags             TEXT[]      DEFAULT '{}',
  min_level        TEXT        CONSTRAINT exchange_products_min_level_check
                               CHECK (min_level IS NULL OR min_level IN (
                                 'Citizen','Bronze','Silver','Gold','Platinum'
                               )),
  how_to_redeem    TEXT        NOT NULL DEFAULT '',
  terms            TEXT        NOT NULL DEFAULT '',
  is_active        BOOLEAN     DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exchange_products_active
  ON exchange_products(is_active, category);
CREATE INDEX IF NOT EXISTS idx_exchange_products_featured
  ON exchange_products(is_featured) WHERE is_featured = TRUE AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_exchange_products_leaderboard
  ON exchange_products(is_leaderboard) WHERE is_leaderboard = TRUE AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_exchange_products_deals
  ON exchange_products(is_daily_deal, deal_ends_at) WHERE is_daily_deal = TRUE AND is_active = TRUE;

-- ============================================================================
-- 2. exchange_redemptions — Per-user redemption history
-- ============================================================================

CREATE TABLE IF NOT EXISTS exchange_redemptions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID        NOT NULL REFERENCES exchange_products(id),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points_used      INTEGER     NOT NULL,
  redemption_code  TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'upcoming'
                               CONSTRAINT exchange_redemptions_status_check
                               CHECK (status IN ('upcoming','completed','expired','cancelled')),
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exchange_redemptions_user
  ON exchange_redemptions(user_id, created_at DESC);

-- ============================================================================
-- 3. exchange_wishlist — Saved rewards per user
-- ============================================================================

CREATE TABLE IF NOT EXISTS exchange_wishlist (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES exchange_products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_exchange_wishlist_user
  ON exchange_wishlist(user_id);

-- ============================================================================
-- 4. Row Level Security
-- ============================================================================

ALTER TABLE exchange_products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_wishlist    ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exchange_products' AND policyname = 'Anyone can view active exchange products') THEN
    CREATE POLICY "Anyone can view active exchange products"
      ON exchange_products FOR SELECT
      USING (is_active = TRUE);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exchange_redemptions' AND policyname = 'Users can view own exchange redemptions') THEN
    CREATE POLICY "Users can view own exchange redemptions"
      ON exchange_redemptions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exchange_wishlist' AND policyname = 'Users can view own wishlist') THEN
    CREATE POLICY "Users can view own wishlist"
      ON exchange_wishlist FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exchange_wishlist' AND policyname = 'Users can add to own wishlist') THEN
    CREATE POLICY "Users can add to own wishlist"
      ON exchange_wishlist FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exchange_wishlist' AND policyname = 'Users can remove from own wishlist') THEN
    CREATE POLICY "Users can remove from own wishlist"
      ON exchange_wishlist FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- 5. Seed data — Product catalogue
-- ============================================================================

INSERT INTO exchange_products
  (name, description, emoji, bg_color, brand_name, points_cost, real_price, discount_percent,
   category, stock, total_stock, is_sponsored, sponsor_name, is_trending, is_limited, is_new,
   is_featured, rating, reviews_count, delivery_days, tags, how_to_redeem, terms)
VALUES
(
  'Café Coffee Day ₹200 Gift Card',
  'Enjoy a hot cup of your favourite brew at any Café Coffee Day outlet across India. Valid on all beverages and food items.',
  '☕', 'bg-amber-50', 'Café Coffee Day', 250, 200, 20,
  'food', 48, 100, FALSE, NULL, TRUE, FALSE, FALSE,
  TRUE, 4.3, 214, 0,
  ARRAY['coffee','food','cafe','beverage'],
  'After redemption, show the QR code at any CCD outlet. The cashier will scan it and apply the discount.',
  'Valid at all Café Coffee Day outlets. Cannot be combined with other offers. Single use only. Valid for 90 days.'
),
(
  'Amazon Pay Gift Card ₹500',
  'Shop millions of products on Amazon.in. Use this gift card for groceries, electronics, fashion, and more.',
  '📦', 'bg-orange-50', 'Amazon India', 620, 500, 15,
  'gift-cards', 30, 50, FALSE, NULL, TRUE, FALSE, FALSE,
  TRUE, 4.7, 892, 0,
  ARRAY['amazon','shopping','gift card','online'],
  'Copy the code from your redemption page and apply it at checkout on Amazon.in under "Gift cards & promotional codes".',
  'Valid on Amazon.in only. Cannot be used for Amazon Prime subscription. Expires 12 months from issue date.'
),
(
  'Himalaya Herbals Skincare Kit',
  'Premium ayurvedic skincare with neem face wash, aloe vera gel, and moisturising cream. All natural, cruelty-free.',
  '🌿', 'bg-green-50', 'Himalaya', 750, 350, 30,
  'eco', 22, 60, TRUE, 'Tata Trusts', FALSE, FALSE, TRUE,
  FALSE, 4.5, 341, 5,
  ARRAY['skincare','organic','eco','ayurvedic','herbal'],
  'Redeem your IC and we ship the kit to your registered address within 5 business days.',
  'Delivery to PIN codes serviced by Speed Post. CSR sponsored — partially subsidised by Tata Trusts.'
),
(
  'Ola Ride Credits ₹300',
  'Get ₹300 worth of ride credits on Ola. Valid on Ola Micro, Mini, Prime, and Autos.',
  '🚗', 'bg-yellow-50', 'Ola', 340, 300, 12,
  'travel', 75, 100, FALSE, NULL, TRUE, FALSE, FALSE,
  FALSE, 4.1, 528, 0,
  ARRAY['ola','cab','ride','travel','transport'],
  'Apply the promo code in the Ola app under "Vouchers & Offers" before booking your ride.',
  'Valid on Ola app only. Cannot be used for Ola Electric or rentals. Expires 60 days from redemption.'
),
(
  'Jio Recharge ₹149',
  'Unlimited calls, 1GB daily data, and 28-day validity on Jio network. Stay connected, stay impactful.',
  '📱', 'bg-blue-50', 'Reliance Jio', 170, 149, 12,
  'digital', 200, 200, FALSE, NULL, FALSE, FALSE, FALSE,
  FALSE, 4.2, 1240, 0,
  ARRAY['jio','recharge','mobile','data','telecom'],
  'Enter your Jio number and we will top-up your account automatically within minutes.',
  'For Jio prepaid numbers only. One recharge per mobile number per month.'
),
(
  'BookMyShow — 2 Movie Tickets',
  'Watch any movie at any multiplex in your city — PVR, INOX, Cinepolis, and more. Valid for 2 tickets.',
  '🎬', 'bg-red-50', 'BookMyShow', 950, 800, 20,
  'events', 15, 40, FALSE, NULL, FALSE, TRUE, TRUE,
  TRUE, 4.6, 387, 0,
  ARRAY['movies','cinema','entertainment','bookmyshow'],
  'Use the code on BookMyShow app or website during ticket checkout. Applicable to any 2 tickets.',
  '2 tickets of equal or lesser value. Booking fees not covered. Valid until July 31 2026.'
),
(
  'Swiggy ₹200 Off Coupon',
  'Get ₹200 off on your next Swiggy order above ₹399. Fresh food from top restaurants near you.',
  '🍕', 'bg-orange-50', 'Swiggy', 230, 200, 18,
  'food', 60, 100, FALSE, NULL, TRUE, FALSE, FALSE,
  FALSE, 4.4, 672, 0,
  ARRAY['swiggy','food','delivery','restaurant','coupon'],
  'Apply the promo code in the Swiggy app at cart. Discount applies above minimum order value.',
  'Minimum order ₹399. Valid on Swiggy app only. One per user. Expires 30 days from redemption.'
),
(
  'Nykaa ₹500 Beauty Voucher',
  'Shop skincare, makeup, haircare, and more from 2000+ brands on Nykaa.',
  '💄', 'bg-pink-50', 'Nykaa', 580, 500, 14,
  'fashion', 35, 60, FALSE, NULL, FALSE, FALSE, FALSE,
  FALSE, 4.3, 298, 0,
  ARRAY['nykaa','beauty','skincare','makeup','fashion'],
  'Apply the gift voucher code at Nykaa checkout. Can be split across multiple orders.',
  'Valid on Nykaa app and website. Cannot be used for subscription plans. Expires 6 months from issue.'
),
(
  'Plant a Tree + Certificate',
  'We plant a real tree in your name in a reforestation zone and send you a digital certificate with GPS coordinates.',
  '🌳', 'bg-emerald-50', 'GreenYatra', 100, 199, 50,
  'eco', 500, 1000, TRUE, 'Tata Trusts', TRUE, FALSE, FALSE,
  TRUE, 4.9, 1834, 3,
  ARRAY['tree','eco','environment','green','carbon'],
  'Your tree will be planted within 7 days. You''ll receive a digital certificate with photo and GPS location.',
  'CSR sponsored by Tata Trusts. Tree planted in verified reforestation zones. Certificate emailed within 48 hours.'
),
(
  'Decathlon Sports Voucher ₹500',
  'Get active with ₹500 off at Decathlon. Shop cricket gear, yoga mats, cycles, running shoes, and more.',
  '🏋️', 'bg-blue-50', 'Decathlon', 580, 500, 14,
  'fitness', 28, 50, FALSE, NULL, TRUE, FALSE, FALSE,
  TRUE, 4.4, 456, 0,
  ARRAY['decathlon','sports','fitness','cricket','yoga'],
  'Show the QR code at any Decathlon store or apply the code at decathlon.in during checkout.',
  'Valid on purchases above ₹1000. In-store and online. Not valid on already discounted items.'
),
(
  'BYJU''S 1-Month Premium',
  'Unlock all BYJU''S courses for Class 6–12, JEE, NEET, UPSC, and more. Learn from India''s best educators.',
  '📚', 'bg-purple-50', 'BYJU''S', 1400, 999, 40,
  'learning', 50, 100, TRUE, 'Microsoft India', TRUE, FALSE, TRUE,
  TRUE, 4.5, 2143, 0,
  ARRAY['byju''s','education','learning','jee','neet','school'],
  'Enter the activation code in your BYJU''S account under Subscriptions. Premium unlocks immediately.',
  'Valid for one account. Cannot be extended or refunded. Co-sponsored by Microsoft India for student empowerment.'
),
(
  'Organic Farm Box — Weekly',
  'Fresh, certified organic vegetables from local farms delivered to your door. Supports local farmers directly.',
  '🥦', 'bg-lime-50', 'FarmFresh Co.', 400, 350, 25,
  'local', 20, 40, FALSE, NULL, FALSE, TRUE, FALSE,
  FALSE, 4.6, 183, 2,
  ARRAY['organic','farm','vegetables','local','healthy'],
  'Select your delivery slot after redemption. The farm box will be delivered to your address.',
  'Delivery within 10 km radius of partner farms. Weekday delivery slots only. Single use.'
),
(
  'Blood Donation Kit + Certificate',
  'CSR-sponsored donation-drive support kit with nutrition bars, juice, and an official appreciation certificate.',
  '🩸', 'bg-red-50', 'Infosys Foundation', 80, 250, 68,
  'health', 150, 200, TRUE, 'Infosys Foundation', FALSE, FALSE, FALSE,
  FALSE, 4.8, 967, 3,
  ARRAY['blood donation','health','csr','certificate','infosys'],
  'Kit shipped to your address after redemption. Show certificate at blood bank for priority service.',
  '100% CSR sponsored by Infosys Foundation. Delivered to all major cities. Certificate issued jointly.'
),
(
  'National Tech Summit Pass',
  'Full access to India''s premier tech conference — keynotes, workshops, networking, and evening gala.',
  '🎫', 'bg-slate-50', 'TechIndia Events', 2800, 4000, 55,
  'exclusive', 5, 10, TRUE, 'Google India', FALSE, TRUE, TRUE,
  TRUE, 4.9, 42, 3,
  ARRAY['conference','tech','exclusive','networking','summit'],
  'Verified members receive a physical lanyard pass and digital QR ticket within 3 days of redemption.',
  'Gold Reward Level or above required. Non-transferable. Valid only for confirmed date. Limited to 5 passes.'
),
(
  'MG Road Café — 2 Coffees Free',
  'Enjoy 2 specialty coffees at MG Road Café, a local social impact business employing young adults with disabilities.',
  '☕', 'bg-yellow-50', 'MG Road Café', 120, 180, 33,
  'local', 30, 50, FALSE, NULL, FALSE, FALSE, FALSE,
  FALSE, 4.7, 89, 0,
  ARRAY['local','cafe','coffee','social enterprise','nearby'],
  'Show the QR code at MG Road Café counter. Valid for any 2 hot or cold beverages.',
  'Valid at MG Road Café outlet only. Dine-in only. Not transferable. Valid 60 days from redemption.'
),
-- Leaderboard-only rewards
(
  'VIP Event Pass — CM Conclave',
  'Meet elected representatives and top bureaucrats at the Chief Minister''s Civic Conclave. Invite-only event.',
  '🏛️', 'bg-amber-50', 'State Government', 5000, 10000, 50,
  'exclusive', 3, 3, FALSE, NULL, FALSE, TRUE, FALSE,
  FALSE, 5.0, 8, 3,
  ARRAY['vip','exclusive','government','conclave'],
  'Verified by MLA office. Pass issued after identity verification.',
  'Platinum level only. Non-transferable. Valid for announced date only.'
),
(
  'Scholarship Voucher — ₹10,000',
  'Full scholarship for a 3-month skill development or coding bootcamp at a partner institute.',
  '🎓', 'bg-purple-50', 'NSDC Partner', 8000, 10000, 20,
  'learning', 5, 5, TRUE, 'Microsoft India', FALSE, TRUE, FALSE,
  FALSE, 4.9, 14, 7,
  ARRAY['scholarship','education','bootcamp','skill'],
  'Enrolment confirmed within 7 days after verification by partner institute.',
  'Gold level or above. Academic year 2026–27 only. One per user.'
),
(
  'Premium Internship Certificate',
  'A verified 4-week virtual internship at a CSR partner company with a co-signed certificate of excellence.',
  '💼', 'bg-slate-50', 'Infosys Foundation', 3500, 5000, 30,
  'exclusive', 8, 10, TRUE, 'Infosys Foundation', FALSE, TRUE, TRUE,
  FALSE, 4.8, 21, 3,
  ARRAY['internship','career','certificate','infosys'],
  'Onboarding email with internship schedule sent within 48 hours.',
  'Silver level or above. Requires 10 hours/week commitment for 4 weeks.'
);

-- Mark leaderboard products and set min_level
UPDATE exchange_products SET is_leaderboard = TRUE, min_level = 'Platinum' WHERE name = 'VIP Event Pass — CM Conclave';
UPDATE exchange_products SET is_leaderboard = TRUE, min_level = 'Gold'     WHERE name = 'Scholarship Voucher — ₹10,000';
UPDATE exchange_products SET is_leaderboard = TRUE, min_level = 'Silver'   WHERE name = 'Premium Internship Certificate';
UPDATE exchange_products SET min_level = 'Gold'                             WHERE name = 'National Tech Summit Pass';

-- Mark daily deals with countdown (relative to now + some hours)
UPDATE exchange_products
SET is_daily_deal = TRUE,
    deal_ends_at  = NOW() + INTERVAL '4 hours 30 minutes',
    deal_claimed  = 78,
    deal_total    = 100
WHERE name = 'Amazon Pay Gift Card ₹500';

UPDATE exchange_products
SET is_daily_deal = TRUE,
    deal_ends_at  = NOW() + INTERVAL '2 hours 12 minutes',
    deal_claimed  = 43,
    deal_total    = 50
WHERE name = 'Swiggy ₹200 Off Coupon';

-- ============================================================================
-- DONE
-- ============================================================================
