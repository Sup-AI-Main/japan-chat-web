BEGIN;

-- =========================================================
-- A. entities.details_json 컬럼 추가
-- =========================================================

ALTER TABLE public.entities
ADD COLUMN IF NOT EXISTS details_json jsonb;


-- =========================================================
-- B. admin_save_entity_editor_v1 RPC
-- =========================================================

CREATE OR REPLACE FUNCTION public.admin_save_entity_editor_v1(
  p_entity_id uuid,
  p_expected_updated_at timestamptz,
  p_details jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated_entity RECORD;
BEGIN
  -- Atomic optimistic concurrency:
  -- UPDATE only if updated_at matches. RETURNING gives us the row if matched.
  -- If 0 rows returned, it means stale updated_at (conflict).
  UPDATE public.entities
  SET details_json = p_details
  WHERE id = p_entity_id
    AND updated_at = p_expected_updated_at
  RETURNING id, slug, display_name, entity_type, updated_at, details_json
  INTO v_updated_entity;

  IF v_updated_entity IS NULL THEN
    -- Conflict: entity was modified since client last read it.
    -- Return current state so client can show conflict UI.
    SELECT id, slug, display_name, entity_type, updated_at, details_json
    INTO v_updated_entity
    FROM public.entities
    WHERE id = p_entity_id;

    IF v_updated_entity IS NULL THEN
      RAISE EXCEPTION 'ENTITY_NOT_FOUND'
        USING ERRCODE = 'P0002';
    END IF;

    RETURN jsonb_build_object(
      'conflict', true,
      'current_updated_at', v_updated_entity.updated_at,
      'id', v_updated_entity.id,
      'slug', v_updated_entity.slug,
      'display_name', v_updated_entity.display_name,
      'entity_type', v_updated_entity.entity_type,
      'details_json', v_updated_entity.details_json
    );
  END IF;

  -- Success: return updated entity with new updated_at.
  -- NOTE: set_entities_updated_at trigger updates updated_at = now() on UPDATE.
  -- Re-read to get the trigger-set updated_at.
  SELECT id, slug, display_name, entity_type, updated_at, details_json
  INTO v_updated_entity
  FROM public.entities
  WHERE id = p_entity_id;

  RETURN jsonb_build_object(
    'conflict', false,
    'id', v_updated_entity.id,
    'slug', v_updated_entity.slug,
    'display_name', v_updated_entity.display_name,
    'entity_type', v_updated_entity.entity_type,
    'updated_at', v_updated_entity.updated_at,
    'details_json', v_updated_entity.details_json
  );
END;
$$;

-- Lock down: only service_role can execute
REVOKE EXECUTE
ON FUNCTION public.admin_save_entity_editor_v1(uuid, timestamptz, jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.admin_save_entity_editor_v1(uuid, timestamptz, jsonb)
TO service_role;

COMMIT;
