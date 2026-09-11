---------------------------------------------------------------------------
-- anon role SELECT-only RLS
-- Goal: anon (publishable key) can only SELECT; service role bypasses RLS.
-- Tables: entities, golf_courses, hotels, restaurants, faq, categories,
--          areas, content_sections, includes_excludes, travel_times,
--          restaurant_locations
---------------------------------------------------------------------------

-- 1. Enable RLS on all tables
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golf_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.includes_excludes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_locations ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing policies (idempotent)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END$$;

-- 3. Create SELECT policies for anon
CREATE POLICY "anon_select" ON public.entities FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON public.golf_courses FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON public.hotels FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON public.restaurants FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON public.faq FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON public.categories FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON public.areas FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON public.content_sections FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON public.includes_excludes FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON public.travel_times FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON public.restaurant_locations FOR SELECT TO anon USING (true);

-- 4. Grant SELECT to anon
GRANT SELECT ON public.entities TO anon;
GRANT SELECT ON public.golf_courses TO anon;
GRANT SELECT ON public.hotels TO anon;
GRANT SELECT ON public.restaurants TO anon;
GRANT SELECT ON public.faq TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.areas TO anon;
GRANT SELECT ON public.content_sections TO anon;
GRANT SELECT ON public.includes_excludes TO anon;
GRANT SELECT ON public.travel_times TO anon;
GRANT SELECT ON public.restaurant_locations TO anon;

-- Note: authenticated role inherits from anon so also gets SELECT.
-- service_role bypasses RLS, so CRUD from server-side works without policies.