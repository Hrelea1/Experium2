-- =============================================================================
-- Experium Database Schema
-- Standard PostgreSQL — No Supabase-specific syntax
-- Run this on any PostgreSQL 14+ server with: psql -U postgres -d experium -f schema.sql
-- =============================================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()

-- ─── Helper: auto-update updated_at ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- USERS & AUTH
-- Replaces auth.users (Supabase managed). We own the credentials now.
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT,           -- NULL for OAuth-only users
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'user'
                CHECK (role IN ('admin', 'moderator', 'provider', 'user')),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- OTP table for email verification and passwordless login
CREATE TABLE IF NOT EXISTS registration_otps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  otp_code    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes')
);
CREATE INDEX IF NOT EXISTS idx_otps_email ON registration_otps(email);

-- =============================================================================
-- PROFILES
-- Extended user data (display info, avatar, phone)
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS provider_profiles (
  user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mode        TEXT NOT NULL DEFAULT 'instant' CHECK (mode IN ('instant', 'assisted')),
  is_starred  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS provider_profiles_updated_at ON provider_profiles;
CREATE TRIGGER provider_profiles_updated_at BEFORE UPDATE ON provider_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user insert
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.full_name)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_user_created ON users;
CREATE TRIGGER on_user_created AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_user();

-- =============================================================================
-- LOCATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS regions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  slug          TEXT NOT NULL UNIQUE,
  image_url     TEXT,
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS counties (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  slug      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(region_id, name)
);

CREATE TABLE IF NOT EXISTS cities (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES counties(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  slug      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(county_id, name)
);

CREATE INDEX IF NOT EXISTS idx_counties_region ON counties(region_id);
CREATE INDEX IF NOT EXISTS idx_cities_county   ON cities(county_id);

-- =============================================================================
-- CATEGORIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  slug          TEXT NOT NULL UNIQUE,
  icon          TEXT,
  image_url     TEXT,
  description   TEXT,
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- EXPERIENCES
-- =============================================================================
CREATE TABLE IF NOT EXISTS experiences (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  short_description TEXT,
  includes          TEXT[] DEFAULT '{}'::text[],
  price             DECIMAL(10,2) NOT NULL,
  original_price    DECIMAL(10,2),
  child_price       DECIMAL(10,2),
  category_id       UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  region_id         UUID NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
  county_id         UUID REFERENCES counties(id) ON DELETE SET NULL,
  city_id           UUID REFERENCES cities(id) ON DELETE SET NULL,
  location_name     TEXT NOT NULL,
  duration_minutes  INTEGER,
  max_participants  INTEGER DEFAULT 10,
  min_age           INTEGER,
  avg_rating        DECIMAL(3,2) DEFAULT 0,
  total_reviews     INTEGER DEFAULT 0,
  is_active         BOOLEAN DEFAULT true,
  is_featured       BOOLEAN DEFAULT false,
  provider_type     TEXT NOT NULL DEFAULT 'service' CHECK (provider_type IN ('accommodation', 'service')),
  google_maps_url   TEXT,
  latitude          NUMERIC(10, 7),
  longitude         NUMERIC(10, 7),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS experiences_updated_at ON experiences;
CREATE TRIGGER experiences_updated_at BEFORE UPDATE ON experiences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_experiences_category  ON experiences(category_id);
CREATE INDEX IF NOT EXISTS idx_experiences_region    ON experiences(region_id);
CREATE INDEX IF NOT EXISTS idx_experiences_active    ON experiences(is_active);
CREATE INDEX IF NOT EXISTS idx_experiences_featured  ON experiences(is_featured);
CREATE INDEX IF NOT EXISTS idx_experiences_price     ON experiences(price);
CREATE INDEX IF NOT EXISTS idx_experiences_rating    ON experiences(avg_rating);
CREATE INDEX IF NOT EXISTS idx_experiences_filter    ON experiences(category_id, region_id, price, avg_rating, is_active);
CREATE INDEX IF NOT EXISTS idx_experiences_search    ON experiences USING gin(to_tsvector('romanian', title || ' ' || description));

CREATE TABLE IF NOT EXISTS experience_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  is_primary    BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exp_images_exp ON experience_images(experience_id);

CREATE TABLE IF NOT EXISTS experience_services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id   UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  price           DECIMAL(10,2) NOT NULL,
  max_quantity    INTEGER NOT NULL DEFAULT 1,
  is_required     BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  display_order   INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exp_services_exp ON experience_services(experience_id);

-- =============================================================================
-- PROVIDERS
-- Links a user account to an experience as the provider
-- =============================================================================
CREATE TABLE IF NOT EXISTS experience_providers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id     UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  provider_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(experience_id, provider_user_id)
);

-- =============================================================================
-- AVAILABILITY
-- =============================================================================
CREATE TABLE IF NOT EXISTS availability_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  provider_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  slot_date     DATE NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME,
  capacity      INTEGER NOT NULL DEFAULT 10,
  booked_count  INTEGER NOT NULL DEFAULT 0,
  is_locked     BOOLEAN NOT NULL DEFAULT false,
  locked_until  TIMESTAMPTZ,
  locked_by     TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_slots_exp_date ON availability_slots(experience_id, slot_date);

CREATE TABLE IF NOT EXISTS availability_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL,  -- FK added after bookings table
  confirm_token   UUID NOT NULL DEFAULT gen_random_uuid(),
  decline_token   UUID NOT NULL DEFAULT gen_random_uuid(),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','declined','expired')),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- BOOKINGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  experience_id         UUID NOT NULL REFERENCES experiences(id) ON DELETE RESTRICT,
  voucher_id            UUID,  -- FK added after vouchers table
  booking_date          TIMESTAMPTZ NOT NULL,
  slot_date             DATE,
  participants          INTEGER NOT NULL DEFAULT 1,
  status                TEXT NOT NULL DEFAULT 'confirmed'
                          CHECK (status IN ('pending','confirmed','cancelled','completed')),
  total_price           NUMERIC NOT NULL,
  payment_method        TEXT,
  special_requests      TEXT,
  cancellation_date     TIMESTAMPTZ,
  cancellation_reason   TEXT,
  rescheduled_count     INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS bookings_updated_at ON bookings;
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_bookings_user        ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_experience  ON bookings(experience_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status      ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date        ON bookings(booking_date);

-- Now add the FK for availability_requests (IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_avail_req_booking' AND table_name = 'availability_requests'
  ) THEN
    ALTER TABLE availability_requests
      ADD CONSTRAINT fk_avail_req_booking
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =============================================================================
-- VOUCHERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS vouchers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  experience_id     UUID REFERENCES experiences(id) ON DELETE SET NULL,
  code              TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','used','expired','exchanged','transferred')),
  issue_date        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_date       TIMESTAMPTZ NOT NULL,
  redemption_date   TIMESTAMPTZ,
  purchase_price    NUMERIC NOT NULL,
  qr_code_data      TEXT,
  notes             TEXT,
  transferred_to    TEXT,
  transferred_date  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS vouchers_updated_at ON vouchers;
CREATE TRIGGER vouchers_updated_at BEFORE UPDATE ON vouchers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_vouchers_user   ON vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_code   ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);

-- Now add FK from bookings to vouchers (IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_bookings_voucher' AND table_name = 'bookings'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT fk_bookings_voucher
      FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- CART
-- =============================================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  quantity      INTEGER NOT NULL DEFAULT 1,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, experience_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);

-- =============================================================================
-- SEED: Primary admin account
-- Replace the password hash below with a real bcrypt hash for your password.
-- Generate one with: node -e "require('bcryptjs').hash('YourPassword',12).then(console.log)"
-- =============================================================================
INSERT INTO users (email, password_hash, full_name, role, is_verified)
VALUES (
  'hrelea001@gmail.com',
  '$2a$12$kDxtmGwTYnjtwJ47Ar.v9uleOu7QBWU0zz0rQ20Fg439kKD/O8YU6',
  'Admin Hrelea',
  'admin',
  true
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_verified = EXCLUDED.is_verified;

-- =============================================================================
-- HOMEPAGE CONTENT (CMS)
-- =============================================================================
CREATE TABLE IF NOT EXISTS homepage_content (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key  TEXT NOT NULL UNIQUE,
  content      JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS homepage_content_updated_at ON homepage_content;
CREATE TRIGGER homepage_content_updated_at BEFORE UPDATE ON homepage_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PROVIDER NOTIFICATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS provider_notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  message           TEXT NOT NULL,
  type              TEXT NOT NULL DEFAULT 'info',
  reference_id      UUID,
  is_read           BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pn_provider ON provider_notifications(provider_user_id, is_read);

-- =============================================================================
-- REVIEWS
-- =============================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating        INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment       TEXT,
  status        TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(experience_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_exp ON reviews(experience_id);

CREATE OR REPLACE FUNCTION update_experience_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE experiences
    SET total_reviews = (SELECT count(*) FROM reviews WHERE experience_id = NEW.experience_id AND status = 'approved'),
        avg_rating = COALESCE((SELECT avg(rating)::numeric(3,2) FROM reviews WHERE experience_id = NEW.experience_id AND status = 'approved'), 0)
    WHERE id = NEW.experience_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE experiences
    SET total_reviews = (SELECT count(*) FROM reviews WHERE experience_id = OLD.experience_id AND status = 'approved'),
        avg_rating = COALESCE((SELECT avg(rating)::numeric(3,2) FROM reviews WHERE experience_id = OLD.experience_id AND status = 'approved'), 0)
    WHERE id = OLD.experience_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_rating ON reviews;
CREATE TRIGGER trg_update_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_experience_rating();

-- =============================================================================
-- DONE
-- =============================================================================

-- ADD MISSING COLUMNS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='experiences' AND column_name='google_maps_url'
  ) THEN
    ALTER TABLE experiences ADD COLUMN google_maps_url TEXT;
  END IF;
END $$;

-- RESTRICT CATEGORIES TO SPECIFIC FOUR
-- This block ensures only the four requested categories exist.
DO $$
BEGIN
  -- 1. Ensure the 4 requested categories exist
  INSERT INTO categories (name, slug, display_order)
  VALUES 
    ('Relax și Spa', 'spa-si-relaxare', 1),
    ('Gourmet', 'gastronomie', 2),
    ('Adrenalină și Sport', 'aventura-si-sport', 3),
    ('Natură', 'natura', 4)
  ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    display_order = EXCLUDED.display_order;

  -- 2. Update experiences currently in categories that are about to be deleted
  UPDATE experiences
  SET category_id = (SELECT id FROM categories WHERE slug = 'natura')
  WHERE category_id NOT IN (
    SELECT id FROM categories WHERE slug IN ('spa-si-relaxare', 'gastronomie', 'aventura-si-sport', 'natura')
  );

    -- 3. Delete all other categories
  DELETE FROM categories
  WHERE slug NOT IN ('spa-si-relaxare', 'gastronomie', 'aventura-si-sport', 'natura');
END $$;

-- ADD MISSING MAP COLUMNS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='experiences' AND column_name='latitude'
  ) THEN
    ALTER TABLE experiences ADD COLUMN latitude NUMERIC(15, 7);
    ALTER TABLE experiences ADD COLUMN longitude NUMERIC(15, 7);
  END IF;
END $$;

-- =============================================================================
-- BLOG MODULE
-- =============================================================================
CREATE TABLE IF NOT EXISTS blog_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  content       TEXT,
  excerpt       TEXT,
  cover_image   TEXT,
  featured_image TEXT,
  meta_title    TEXT,
  meta_description TEXT,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author        TEXT,
  category_id   UUID REFERENCES blog_categories(id) ON DELETE SET NULL,
  tags          TEXT[] DEFAULT '{}'::text[],
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS blog_posts_updated_at ON blog_posts;
CREATE TRIGGER blog_posts_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PARTNER APPLICATIONS
-- =============================================================================
DROP TABLE IF EXISTS partner_applications CASCADE;
CREATE TABLE IF NOT EXISTS partner_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL,
  business_name   TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT NOT NULL,
  city            TEXT NOT NULL,
  experience_type TEXT NOT NULL,
  description     TEXT,
  website         TEXT,
  gdpr_consent    BOOLEAN NOT NULL DEFAULT false,
  terms_accepted  BOOLEAN NOT NULL DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'approved', 'rejected')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS partner_app_updated_at ON partner_applications;
CREATE TRIGGER partner_app_updated_at BEFORE UPDATE ON partner_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- CONTENT AUDIT
-- =============================================================================
CREATE TABLE IF NOT EXISTS homepage_content_audit (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key  TEXT NOT NULL,
  old_content  JSONB,
  new_content  JSONB,
  changed_by   TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

