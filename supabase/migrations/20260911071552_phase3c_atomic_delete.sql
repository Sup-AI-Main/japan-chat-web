-- Phase 3-C: Atomic cascade delete functions
-- These functions ensure that multi-table deletes happen in a single transaction.
-- If any step fails, the entire operation is rolled back.

-- 1. Area Cascade Delete
CREATE OR REPLACE FUNCTION delete_area_cascade(p_area_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_impact JSONB;
  v_entity_ids UUID[];
BEGIN
  -- Collect all entity IDs for this area
  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
  INTO v_entity_ids
  FROM entities
  WHERE area_id = p_area_id;

  -- Build impact report
  SELECT jsonb_build_object(
    'entities', (SELECT count(*) FROM entities WHERE area_id = p_area_id),
    'hotels', (SELECT count(*) FROM hotels WHERE entity_id = ANY(v_entity_ids)),
    'golf_courses', (SELECT count(*) FROM golf_courses WHERE entity_id = ANY(v_entity_ids)),
    'restaurants', (SELECT count(*) FROM restaurants WHERE entity_id = ANY(v_entity_ids)),
    'faq', (SELECT count(*) FROM faq WHERE area_id = p_area_id),
    'travel_times', (SELECT count(*) FROM travel_times
                     WHERE from_entity_id = ANY(v_entity_ids) OR to_entity_id = ANY(v_entity_ids)),
    'content_sections', (SELECT count(*) FROM content_sections WHERE parent_entity_id = ANY(v_entity_ids)),
    'includes_excludes', (SELECT count(*) FROM includes_excludes WHERE parent_entity_id = ANY(v_entity_ids)),
    'entity_field_values', (SELECT count(*) FROM entity_field_values WHERE entity_id = ANY(v_entity_ids)),
    'entity_categories', (SELECT count(*) FROM entity_categories WHERE entity_id = ANY(v_entity_ids))
  ) INTO v_impact;

  -- Delete in order within this transaction
  -- 1. travel_times (from or to)
  DELETE FROM travel_times
  WHERE from_entity_id = ANY(v_entity_ids) OR to_entity_id = ANY(v_entity_ids);

  -- 2. entity_field_values
  DELETE FROM entity_field_values WHERE entity_id = ANY(v_entity_ids);

  -- 3. entity_categories
  DELETE FROM entity_categories WHERE entity_id = ANY(v_entity_ids);

  -- 4. field_definition_scopes referencing this area
  DELETE FROM field_definition_scopes WHERE area_id = p_area_id;

  -- 5. entities (CASCADE handles: hotels, golf_courses, restaurants, content_sections, includes_excludes, restaurant_locations, field_definitions.scope_entity_id)
  DELETE FROM entities WHERE area_id = p_area_id;

  -- 6. faq
  DELETE FROM faq WHERE area_id = p_area_id;

  -- 7. the area itself
  DELETE FROM areas WHERE id = p_area_id;

  -- Return impact report for logging
  RETURN v_impact;
END;
$$;

-- 2. Category Cascade Delete
CREATE OR REPLACE FUNCTION delete_category_cascade(p_category_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_impact JSONB;
BEGIN
  -- Build impact report
  SELECT jsonb_build_object(
    'entity_categories', (SELECT count(*) FROM entity_categories WHERE category_id = p_category_id),
    'faq', (SELECT count(*) FROM faq WHERE category_id = p_category_id),
    'field_definition_scopes', (SELECT count(*) FROM field_definition_scopes WHERE category_id = p_category_id),
    'entities_primary', (SELECT count(*) FROM entities WHERE category_id = p_category_id)
  ) INTO v_impact;

  -- Delete in order within this transaction
  -- 1. entity_categories
  DELETE FROM entity_categories WHERE category_id = p_category_id;

  -- 2. faq
  DELETE FROM faq WHERE category_id = p_category_id;

  -- 3. field_definition_scopes
  DELETE FROM field_definition_scopes WHERE category_id = p_category_id;

  -- 4. entities: set category_id to NULL (KEEP entities, only remove category reference)
  UPDATE entities SET category_id = NULL WHERE category_id = p_category_id;

  -- 5. the category itself
  DELETE FROM categories WHERE id = p_category_id;

  -- Return impact report for logging
  RETURN v_impact;
END;
$$;

-- 3. Entity Cascade Delete
-- Already handled by FK CASCADE on single DELETE statement.
-- This function exists for consistency and change logging.
CREATE OR REPLACE FUNCTION delete_entity_cascade(p_entity_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_impact JSONB;
BEGIN
  -- Build impact report
  SELECT jsonb_build_object(
    'hotels', (SELECT count(*) FROM hotels WHERE entity_id = p_entity_id),
    'golf_courses', (SELECT count(*) FROM golf_courses WHERE entity_id = p_entity_id),
    'restaurants', (SELECT count(*) FROM restaurants WHERE entity_id = p_entity_id),
    'content_sections', (SELECT count(*) FROM content_sections WHERE parent_entity_id = p_entity_id),
    'includes_excludes', (SELECT count(*) FROM includes_excludes WHERE parent_entity_id = p_entity_id),
    'travel_times', (SELECT count(*) FROM travel_times
                     WHERE from_entity_id = p_entity_id OR to_entity_id = p_entity_id),
    'entity_field_values', (SELECT count(*) FROM entity_field_values WHERE entity_id = p_entity_id),
    'entity_categories', (SELECT count(*) FROM entity_categories WHERE entity_id = p_entity_id),
    'restaurant_locations', (SELECT count(*) FROM restaurant_locations
                             WHERE restaurant_entity_id = p_entity_id OR near_entity_id = p_entity_id)
  ) INTO v_impact;

  -- Single DELETE — FK CASCADE handles all subtables atomically
  DELETE FROM entities WHERE id = p_entity_id;

  RETURN v_impact;
END;
$$;

-- 4. Field Definition Cascade Delete
-- Already handled by FK CASCADE on single DELETE statement.
-- This function exists for consistency and change logging.
CREATE OR REPLACE FUNCTION delete_field_definition_cascade(p_field_def_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_impact JSONB;
BEGIN
  -- Build impact report
  SELECT jsonb_build_object(
    'entity_field_values', (SELECT count(*) FROM entity_field_values WHERE field_definition_id = p_field_def_id),
    'field_definition_scopes', (SELECT count(*) FROM field_definition_scopes WHERE field_definition_id = p_field_def_id)
  ) INTO v_impact;

  -- Single DELETE — FK CASCADE handles: entity_field_values, field_definition_scopes
  DELETE FROM field_definitions WHERE id = p_field_def_id;

  RETURN v_impact;
END;
$$;
