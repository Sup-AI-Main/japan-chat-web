-- Migration: #8 Index Optimization for Japan Guide DB
-- Date: 2026-09-09
-- Reference: DB_STRUCTURE_V2.md entity-model, supabase-cms.ts query patterns
-- NOTE: All CREATE INDEX use IF NOT EXISTS to be idempotent
--
-- supabase-cms.ts query patterns analyzed:
--   getGolfCourses/Hotels/Restaurants: .eq("entities.areas.code", area) → JOIN on entities → filter active → order by entities.sort
--   getGolfCourseById/HotelById: .eq("entities.slug", id) → PK on entities.slug (already unique)
--   getRestaurants: FROM restaurant_locations → JOIN restaurant:entities + near:entities
--   getRestaurantById: FROM entities WHERE slug + entity_type → restaurant_locations WHERE restaurant_entity_id
--   getTravelTimes: active=true, filter from_entity.areas.code, order by sort
--   getAdminFaq: order by sort, filter scope=COMMON/SPECIFIC
--   getAreaFaq: scope=SPECIFIC, area_id filter, category_id filter, related_entity_id, active=true, sort
--   getContentSections: parent_entity_id, is_visible OR includeHidden, sort
--   getIncludesExcludes: parent_entity_id, is_visible OR includeHidden, sort

-- 1. entities: main listing queries by (area_id, type) + sort
CREATE INDEX IF NOT EXISTS entities_area_type_sort_idx
  ON public.entities(area_id, entity_type, active, sort);

-- 2. areas: PK on (id), UNIQUE on (code) already in primary key / unique constraint
--    No additional index needed.

-- 3. categories: group_type + active + navigation_visible + sort
--    Covers getAreaCategories (group_type=AREA, active=true), getCommonCategories (group_type=COMMON)
CREATE INDEX IF NOT EXISTS categories_group_active_nav_sort_idx
  ON public.categories(group_type, active, navigation_visible, sort);

-- 4. faq: scope + area + category + active + sort (covers getAdminFaq, getAreaFaq)
CREATE INDEX IF NOT EXISTS faq_scope_area_active_sort_idx
  ON public.faq(area_id, scope, active, sort);

-- 5. faq: related_entity_id (for entity→FAQ lookups, partial index to skip NULLs)
CREATE INDEX IF NOT EXISTS faq_related_entity_idx
  ON public.faq(related_entity_id)
  WHERE related_entity_id IS NOT NULL;

-- 6. content_sections: parent_entity_id + visible + sort (covers getContentSections)
CREATE INDEX IF NOT EXISTS content_sections_parent_visible_sort_idx
  ON public.content_sections(parent_entity_id, is_visible, sort);

-- 7. includes_excludes: parent_entity_id + visible + sort (covers getIncludesExcludes)
CREATE INDEX IF NOT EXISTS includes_excludes_parent_visible_sort_idx
  ON public.includes_excludes(parent_entity_id, is_visible, sort);

-- 8. restaurant_locations: restaurant_entity_id + sort (covers getRestaurantById)
CREATE INDEX IF NOT EXISTS restaurant_locations_restaurant_idx
  ON public.restaurant_locations(restaurant_entity_id, sort);

-- 9. restaurant_locations: near_entity_id + sort (covers getRestaurants lookups)
CREATE INDEX IF NOT EXISTS restaurant_locations_near_idx
  ON public.restaurant_locations(near_entity_id, sort);

-- 10. travel_times: active + sort (covers getTravelTimes with active=true filter)
CREATE INDEX IF NOT EXISTS travel_times_active_sort_idx
  ON public.travel_times(active, sort)
  WHERE active = TRUE;