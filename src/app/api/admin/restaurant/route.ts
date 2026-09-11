import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getRestaurants, appendRestaurant, updateRestaurant, deleteRestaurantRow } from "@/lib/supabase-cms";
import { ConflictError } from "@/lib/types";
import { ok, created, badRequest, conflict, serverError, safeJson } from "@/lib/crud/response";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  const area = req.nextUrl.searchParams.get("area") || undefined;
  const restaurants = await getRestaurants(area || undefined);
  return ok({ restaurants });
}

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  try {
    const body = await safeJson<Record<string, string>>(req);
    if (!body) return badRequest("Empty request body");
    if (!body.active) body.active = "TRUE";
    const { id, slug } = await appendRestaurant(body);
    return created({ id, slug, restaurant: { ...body, id, slug } });
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  const body = await safeJson<Record<string, string>>(req);
  if (!body) return badRequest("Empty request body");
  const { id, updated_at, ...data } = body;
  if (!id) return badRequest("Missing id");
  try {
    const success = await updateRestaurant(id, data, updated_at);
    return ok({ success });
  } catch (err) {
    if (err instanceof ConflictError) {
      return conflict(err.message);
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return badRequest("Missing id");
  const success = await deleteRestaurantRow(id);
  return ok({ success });
}
