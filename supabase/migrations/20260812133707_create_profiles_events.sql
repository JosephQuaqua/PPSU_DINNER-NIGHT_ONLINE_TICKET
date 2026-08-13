/*
# PPSU Events — Profiles & Events Tables

1. New Tables
   - profiles: user profile (full name, student ID, email, phone, avatar)
   - events: event listings with capacity, pricing, UPI payment info, status

2. Security
   - RLS enabled on both tables.
   - Profiles: users read/update only their own profile.
   - Events: public (anon) can read active/sold_out/completed events; staff can
     read all and insert/update.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  student_id text,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  short_description text,
  venue text NOT NULL,
  address text,
  event_date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  capacity integer NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  tickets_sold integer NOT NULL DEFAULT 0 CHECK (tickets_sold >= 0),
  ticket_price numeric(10,2) NOT NULL DEFAULT 0 CHECK (ticket_price >= 0),
  upi_id text,
  upi_qr_url text,
  banner_url text,
  reservation_expiry_hours integer NOT NULL DEFAULT 24 CHECK (reservation_expiry_hours >= 1),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','sold_out','completed','cancelled')),
  is_featured boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_featured ON public.events(is_featured);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(event_date);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select_public" ON public.events;
CREATE POLICY "events_select_public" ON public.events
  FOR SELECT TO anon, authenticated
  USING (status IN ('active','sold_out','completed'));

DROP POLICY IF EXISTS "events_select_staff" ON public.events;
CREATE POLICY "events_select_staff" ON public.events
  FOR SELECT TO authenticated
  USING (public.is_event_admin(auth.uid()));

DROP POLICY IF EXISTS "events_insert_staff" ON public.events;
CREATE POLICY "events_insert_staff" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_event_admin(auth.uid()));

DROP POLICY IF EXISTS "events_update_staff" ON public.events;
CREATE POLICY "events_update_staff" ON public.events
  FOR UPDATE TO authenticated
  USING (public.is_event_admin(auth.uid()))
  WITH CHECK (public.is_event_admin(auth.uid()));

GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.events TO authenticated;
