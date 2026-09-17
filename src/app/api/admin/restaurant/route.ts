import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getRestaurants, appendRestaurant, updateRestaurant, deleteRestaurantRow } from "@/lib/supabase-cms";
import { getSupabaseServer } from "@/lib/supabase/server";
import { ConflictError } from "@/lib/types";
import { ok, created, badRequest, conflict, serverError, safeJson } from "@/lib/crud/response";
import { revalidatePath } from "next/cache";

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
    const body = await safeJson<Record<string, unknown>>(req);
    if (!body) return badRequest("Empty request body");
    if (!body.active) body.active = "TRUE";
    const { id, slug } = await appendRestaurant(body as Record<string, string>);
    const restaurant = { ...body, id, slug };
    revalidatePath(`/${(body.area as string || '').toLowerCase()}/restaurant`);
    return created({ id, slug, restaurant });
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  const body = await safeJson<Record<string, unknown>>(req);
  if (!body) return badRequest("Empty request body");
  const { id, updated_at, area, ...restData } = body;
  if (!id) return badRequest("Missing id");
  try {
    const success = await updateRestaurant(id as string, restData as Record<string, string>, updated_at as string | undefined);
    // Re-query slug from DB to ensure it's always present
    const { data: entity } = await getSupabaseServer()
      .from('entities')
      .select('slug')
      .eq('id', id as string)
      .single();
    const restaurant = { ...body, slug: entity?.slug || body.slug || '' };
    if (area) revalidatePath(`/${(area as string).toLowerCase()}/restaurant`);
    return ok({ success, restaurant });
  } catch (err) {
    if (err instanceof ConflictError) {
      return conflict(err.message);
    }
    return serverError(err);
  }
}

export async function DELETE(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return badRequest("Missing id");
  const area = req.nextUrl.searchParams.get("area") || "";
  try {
    const success = await deleteRestaurantRow(id);
    if (area) {
      revalidatePath(`/${area.toLowerCase()}/restaurant`);
    }
    return ok({ success });
  } catch (err) {
    return serverError(err);
  }
}
