import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getEntity, ok, badRequest, unauthorized, serverError } from "@/lib/crud";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isAuthenticated();
  if (!authed) return unauthorized();

  try {
    const { id } = await params;
    if (!id) return badRequest("id가 필요합니다.");

    const entity = await getEntity(id);
    if (!entity) return badRequest("Entity를 찾을 수 없습니다.");

    const db = getSupabaseServer();

    // Fetch subtype data in parallel
    const [hotelRes, golfRes, restaurantRes, restaurantLocsRes, fieldValuesRes, includesRes, contentSectionsRes, travelFromRes, travelToRes] = await Promise.all([
      db.from("hotels").select("*").eq("entity_id", id).maybeSingle(),
      db.from("golf_courses").select("*").eq("entity_id", id).maybeSingle(),
      db.from("restaurants").select("*").eq("entity_id", id).maybeSingle(),
      db.from("restaurant_locations").select("*").eq("restaurant_entity_id", id).order("sort"),
      db.from("entity_field_values").select("id, entity_id, field_definition_id, value_text, value_json, sort, visible, created_at, updated_at, field_definition:field_definitions(id, field_key, label_ko, label_ja, label_en, field_type, icon)").eq("entity_id", id).order("sort"),
      db.from("includes_excludes").select("*").eq("parent_entity_id", id).order("sort"),
      db.from("content_sections").select("*").eq("parent_entity_id", id).order("sort"),
      db.from("travel_times").select("id, from_entity_id, to_entity_id, product_reference_minutes, display_time, min_minutes, max_minutes, note, source, directions_url, time_basis, active, from_entity:entities!from_entity_id(id, display_name), to_entity:entities!to_entity_id(id, display_name)").eq("from_entity_id", id),
      db.from("travel_times").select("id, from_entity_id, to_entity_id, product_reference_minutes, display_time, min_minutes, max_minutes, note, from_entity:entities!from_entity_id(id, display_name)").eq("to_entity_id", id),
    ]);

    return ok({
      entity,
      hotel: hotelRes.data ?? null,
      golf: golfRes.data ?? null,
      restaurant: restaurantRes.data ?? null,
      restaurant_locations: restaurantLocsRes.data ?? [],
      field_values: fieldValuesRes.data ?? [],
      includes_excludes: includesRes.data ?? [],
      content_sections: contentSectionsRes.data ?? [],
      travel_times_from: travelFromRes.data ?? [],
      travel_times_to: travelToRes.data ?? [],
    });
  } catch (err) {
    return serverError(err);
  }
}
