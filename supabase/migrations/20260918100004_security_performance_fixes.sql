-- Security Advisor: fix search_path on mutable functions
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_category_cascade(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_category_cascade(UUID) SECURITY DEFINER;

-- Performance Advisor: add missing FK covering indexes
CREATE INDEX IF NOT EXISTS idx_travel_times_to_entity ON travel_times(to_entity_id);
CREATE INDEX IF NOT EXISTS idx_fd_scope_area ON field_definitions(scope_area_id);
CREATE INDEX IF NOT EXISTS idx_fd_scope_category ON field_definitions(scope_category_id);
CREATE INDEX IF NOT EXISTS idx_faq_category ON faq(category_id);

-- Performance Advisor: drop duplicate index
-- entities_area_type_sort_idx is identical to entities_area_type_active_sort_idx
DROP INDEX IF EXISTS entities_area_type_sort_idx;
