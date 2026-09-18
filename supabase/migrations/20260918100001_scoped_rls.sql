---------------------------------------------------------------------------
-- Scoped RLS migration (A16)
-- Replaces the blanket "drop all public policies" approach.
-- Only targets the 11 known tables. Idempotent.
---------------------------------------------------------------------------

-- Target tables with RLS
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'entities','golf_courses','hotels','restaurants','faq','categories',
    'areas','content_sections','includes_excludes','travel_times','restaurant_locations'
  ];
  r RECORD;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Drop only anon_select policy on this table (idempotent)
    FOR r IN (
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = 'anon_select'
    ) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, t);
    END LOOP;

    -- Create SELECT policy for anon
    EXECUTE format(
      'CREATE POLICY "anon_select" ON public.%I FOR SELECT TO anon USING (true)', t
    );

    -- Grant SELECT to anon
    EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
  END LOOP;
END$$;

-- Note: Policies on other tables (entity_field_values, field_definitions,
-- section_definitions, change_log, entity_categories, etc.) are NOT touched.
-- authenticated role inherits from anon. service_role bypasses RLS.
