-- Migration: Fix faq FK policies
-- Problem: faq.category_id ON DELETE SET NULL conflicts with NOT NULL design.
--           faq.category_id NOT NULL + ON DELETE RESTRICT is correct
--           (soft delete = active=false for categories, not hard delete).
-- faq.related_entity_id stays ON DELETE SET NULL (correct).
-- Date: 2026-09-09

-- 1. Fix faq.category_id FK: SET NULL → RESTRICT
ALTER TABLE public.faq
  DROP CONSTRAINT IF EXISTS faq_category_id_fkey;

ALTER TABLE public.faq
  ADD CONSTRAINT faq_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;

-- 2. faq.related_entity_id: keep ON DELETE SET NULL (no change needed)
-- Current: ON DELETE SET NULL — entity deleted → FAQ stays with related_entity_id=NULL

-- 3. Drop duplicate faq_check if it only checks category_id IS NOT NULL
--    (already enforced by NOT NULL column constraint)
--    NOTE: Only drop if confirmed redundant. Keep faq_scope_check.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'faq_check'
      AND contype = 'c'
      AND conrelid = 'public.faq'::regclass
      AND pg_get_constraintdef(oid) = 'CHECK ((category_id IS NOT NULL))'
  ) THEN
    ALTER TABLE public.faq DROP CONSTRAINT faq_check;
    RAISE NOTICE 'Dropped redundant faq_check (category_id IS NOT NULL already enforced)';
  ELSE
    RAISE NOTICE 'faq_check not redundant, keeping';
  END IF;
END$$;