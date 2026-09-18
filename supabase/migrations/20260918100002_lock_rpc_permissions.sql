-- Lock down cascade delete RPCs:
-- 1. Fix search_path for all SECURITY DEFINER functions
-- 2. Revoke EXECUTE from PUBLIC, anon, authenticated
-- 3. Grant EXECUTE only to service_role (server-only)

-- ============================================================
-- 1. Set safe search_path on all cascade delete functions
-- ============================================================

ALTER FUNCTION delete_area_cascade(UUID)
  SET search_path = public, pg_temp;

ALTER FUNCTION delete_category_cascade(UUID)
  SET search_path = public, pg_temp;

ALTER FUNCTION delete_entity_cascade(UUID)
  SET search_path = public, pg_temp;

ALTER FUNCTION delete_field_definition_cascade(UUID)
  SET search_path = public, pg_temp;

-- ============================================================
-- 2. Revoke EXECUTE from PUBLIC and public-facing roles
-- ============================================================

REVOKE EXECUTE ON FUNCTION delete_area_cascade(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION delete_category_cascade(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION delete_entity_cascade(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION delete_field_definition_cascade(UUID) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 3. Grant EXECUTE to service_role only
-- ============================================================

GRANT EXECUTE ON FUNCTION delete_area_cascade(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION delete_category_cascade(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION delete_entity_cascade(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION delete_field_definition_cascade(UUID) TO service_role;
