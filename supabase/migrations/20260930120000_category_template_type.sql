-- P0 Category template_type: formalize the column and CHECK constraint.
-- The column already exists in production with default 'COMMON'.
-- This migration is idempotent and forward-only.

-- 1. Ensure the column exists (no-op if already present)
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS template_type text NOT NULL DEFAULT 'COMMON';

-- 2. Backfill known entity-template categories from their code/label
--    Only touch rows where template_type is still the default COMMON
--    but group_type says AREA and code matches a known entity type.
UPDATE public.categories
SET    template_type = 'GOLF'
WHERE  code = 'GOLF' AND group_type = 'AREA' AND template_type = 'COMMON';

UPDATE public.categories
SET    template_type = 'HOTEL'
WHERE  code = 'HOTEL' AND group_type = 'AREA' AND template_type = 'COMMON';

UPDATE public.categories
SET    template_type = 'RESTAURANT'
WHERE  code = 'RESTAURANT' AND group_type = 'AREA' AND template_type = 'COMMON';

UPDATE public.categories
SET    template_type = 'ATTRACTION'
WHERE  code = 'ATTRACTION' AND group_type = 'AREA' AND template_type = 'COMMON';

-- 3. Add CHECK constraint on allowed values (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'categories_template_type_check'
      AND conrelid = 'public.categories'::regclass
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_template_type_check
      CHECK (template_type IN ('GOLF','HOTEL','RESTAURANT','ATTRACTION','AREA','COMMON'));
  END IF;
END;
$$;