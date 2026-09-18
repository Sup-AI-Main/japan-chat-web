-- Atomic entity creation RPC
-- Creates entity + entity_categories + subtype row in a single transaction.
-- If any step fails, the entire operation is rolled back.

CREATE OR REPLACE FUNCTION create_entity_with_subtype(
  p_slug TEXT,
  p_display_name TEXT,
  p_entity_type TEXT,
  p_area_id UUID,
  p_category_id UUID DEFAULT NULL,
  p_active BOOLEAN DEFAULT true,
  p_sort INTEGER DEFAULT 999
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_entity_id UUID;
  v_subtype_table TEXT;
  v_row JSONB;
BEGIN
  -- 1. Insert entity
  INSERT INTO entities (slug, display_name, entity_type, area_id, category_id, active, sort)
  VALUES (p_slug, p_display_name, p_entity_type, p_area_id, p_category_id, p_active, p_sort)
  RETURNING id INTO v_entity_id;

  -- 2. Insert entity_categories junction if category provided
  IF p_category_id IS NOT NULL THEN
    INSERT INTO entity_categories (entity_id, category_id, sort)
    VALUES (v_entity_id, p_category_id, 0);
  END IF;

  -- 3. Insert subtype row if applicable
  IF p_entity_type IN ('HOTEL', 'GOLF', 'RESTAURANT') THEN
    v_subtype_table := CASE p_entity_type
      WHEN 'HOTEL' THEN 'hotels'
      WHEN 'GOLF' THEN 'golf_courses'
      WHEN 'RESTAURANT' THEN 'restaurants'
    END;
    EXECUTE format('INSERT INTO %I (entity_id) VALUES ($1)', v_subtype_table)
      USING v_entity_id;
  END IF;

  -- 4. Return created entity
  SELECT jsonb_build_object(
    'id', e.id,
    'slug', e.slug,
    'display_name', e.display_name,
    'entity_type', e.entity_type,
    'area_id', e.area_id,
    'category_id', e.category_id,
    'active', e.active,
    'sort', e.sort,
    'created_at', e.created_at,
    'updated_at', e.updated_at
  ) INTO v_row
  FROM entities e
  WHERE e.id = v_entity_id;

  RETURN v_row;
END;
$$;

-- Lock down: only service_role can execute
REVOKE EXECUTE ON FUNCTION create_entity_with_subtype(TEXT, TEXT, TEXT, UUID, UUID, BOOLEAN, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_entity_with_subtype(TEXT, TEXT, TEXT, UUID, UUID, BOOLEAN, INTEGER) TO service_role;
