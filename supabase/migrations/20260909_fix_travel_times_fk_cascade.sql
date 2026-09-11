-- Migration: Fix travel_times FK ON DELETE to CASCADE
-- Problem: travel_times.from/to FK is NO ACTION but should be CASCADE
-- When an entity is deleted, related travel_times should be deleted too.
-- Date: 2026-09-09

-- Drop existing FK constraints (names from pg_constraint output)
ALTER TABLE public.travel_times
  DROP CONSTRAINT IF EXISTS travel_times_from_entity_id_fkey;

ALTER TABLE public.travel_times
  DROP CONSTRAINT IF EXISTS travel_times_to_entity_id_fkey;

-- Recreate with CASCADE
ALTER TABLE public.travel_times
  ADD CONSTRAINT travel_times_from_entity_id_fkey
  FOREIGN KEY (from_entity_id) REFERENCES public.entities(id) ON DELETE CASCADE;

ALTER TABLE public.travel_times
  ADD CONSTRAINT travel_times_to_entity_id_fkey
  FOREIGN KEY (to_entity_id) REFERENCES public.entities(id) ON DELETE CASCADE;