import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ok, created, badRequest, unauthorized, serverError, safeJson } from "@/lib/crud/response";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return unauthorized();

  try {
    const restaurantEntityId = req.nextUrl.searchParams.get("restaurant_entity_id");
    if (!restaurantEntityId) return badRequest("restaurant_entity_id가 필요합니다.");

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("restaurant_locations")
      .select("*, near_entity:entities!near_entity_id(id, display_name, entity_type)")
      .eq("restaurant_entity_id", restaurantEntityId)
      .order("sort");

    if (error) throw error;
    return ok(data ?? []);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return unauthorized();

  try {
    const body = await safeJson(req);
    if (!body) return badRequest("요청 본문이 비어 있습니다.");
    if (!body.restaurant_entity_id) return badRequest("restaurant_entity_id가 필요합니다.");
    if (!body.near_entity_id) return badRequest("near_entity_id가 필요합니다.");

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("restaurant_locations")
      .insert({
        restaurant_entity_id: body.restaurant_entity_id,
        near_entity_id: body.near_entity_id,
        distance_text: body.distance_text ?? null,
        distance_km: body.distance_km ?? null,
        drive_minutes: body.drive_minutes ?? null,
        walk_minutes: body.walk_minutes ?? null,
        sort: body.sort ?? 0,
      })
      .select("*, near_entity:entities!near_entity_id(id, display_name, entity_type)")
      .single();

    if (error) throw error;
    return created(data);
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return unauthorized();

  try {
    const body = await safeJson(req);
    if (!body?.id) return badRequest("id가 필요합니다.");

    const db = getSupabaseAdmin();
    const updates: Record<string, unknown> = {};
    if (body.distance_text !== undefined) updates.distance_text = body.distance_text;
    if (body.distance_km !== undefined) updates.distance_km = body.distance_km;
    if (body.drive_minutes !== undefined) updates.drive_minutes = body.drive_minutes;
    if (body.walk_minutes !== undefined) updates.walk_minutes = body.walk_minutes;
    if (body.sort !== undefined) updates.sort = body.sort;

    const { data, error } = await db
      .from("restaurant_locations")
      .update(updates)
      .eq("id", body.id)
      .select("*, near_entity:entities!near_entity_id(id, display_name, entity_type)")
      .single();

    if (error) throw error;
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return unauthorized();

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return badRequest("id가 필요합니다.");

    const db = getSupabaseAdmin();
    const { error } = await db.from("restaurant_locations").delete().eq("id", id);
    if (error) throw error;
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
