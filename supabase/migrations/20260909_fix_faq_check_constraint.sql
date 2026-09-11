-- Migration: #6 Fix faq_check CHECK constraint to not conflict with ON DELETE SET NULL
-- Problem: faq.check constraint requires related_entity_id IS NOT NULL for SPECIFIC scope,
--          which conflicts with ON DELETE SET NULL on entities FK.
-- Solution: Remove the CHECK constraint. Validation is handled at application level.
-- Date: 2026-09-09

-- Drop the conflicting CHECK constraint
ALTER TABLE public.faq
  DROP CONSTRAINT IF EXISTS faq_check;

-- Add a new CHECK that only requires related_entity_id for SPECIFIC scope
-- BUT without preventing SET NULL on entity delete
-- Actually, we can't have a CHECK that references SET NULL behavior properly.
-- The right approach: rely on application-level validation (supabase-cms.ts already validates)
-- and allow DB-level ON DELETE SET NULL to work correctly.

-- Verify: after this migration, entity deletion will SET NULL on faq.related_entity_id
-- without violating any CHECK constraint. SPECIFIC FAQ validation stays in application layer.