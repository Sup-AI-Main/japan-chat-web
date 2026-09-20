import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getRestaurants, getRestaurantById, appendRestaurant, updateRestaurant, deleteRestaurantRow, validateRequiredFields } from "@/lib/supabase-cms";
import { ConflictError } from "@/lib/types";
import { ok, created, badRequest, conflict, serverError, safeJson } from "@/lib/crud/response";
import { revalidatePath } from "next/cache";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  try {
    const area = req.nextUrl.searchParams.get("area") || undefined;
    const restaurants = await getRestaurants(area || undefined);
    return ok({ restaurants });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  try {
    const body = await safeJson<Record<string, unknown>>(req);
    if (!body) return badRequest("Empty request body");

    // Server-side required field validation
    const validationError = await validateRequiredFields("RESTAURANT", body);
    if (validationError) return badRequest(validationError);

    if (!body.active) body.active = "TRUE";
    const { id, slug } = await appendRestaurant(body as Record<string, string>);
    const areaCode = (body.area as string || '').toLowerCase();
    if (areaCode) {
      revalidatePath(`/${areaCode}/restaurant`);
      revalidatePath(`/${areaCode}/restaurant/${slug}`);
      revalidatePath("/[area]/restaurant/[id]", "page");
    }
    // Return canonical persisted row from DB
    let canonicalRestaurant = null;
    try {
      canonicalRestaurant = await getRestaurantById(slug);
    } catch { /* fallback to basic response */ }
    return created({ id, slug, restaurant: canonicalRestaurant || { id, slug } });
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  const body = await safeJson<Record<string, unknown>>(req);
  if (!body) return badRequest("Empty request body");

  // Server-side required field validation
  const validationError = await validateRequiredFields("RESTAURANT", body);
  if (validationError) return badRequest(validationError);

  const { id, updated_at, area, ...restData } = body;
  if (!id) return badRequest("Missing id");
  try {
    const success = await updateRestaurant(id as string, restData as Record<string, string>, updated_at as string | undefined);
    if (area) {
      revalidatePath(`/${(area as string).toLowerCase()}/restaurant`);
      revalidatePath("/[area]/restaurant/[id]", "page");
    }
    // Return canonical persisted row from DB
    let canonicalRestaurant = null;
    try {
      canonicalRestaurant = await getRestaurantById(id as string);
    } catch { /* fallback: try by slug from entity */ }
    if (!canonicalRestaurant) {
      // Try re-querying slug from DB
      const { getSupabaseServer } = await import("@/lib/supabase/server");
      const { data: entity } = await getSupabaseServer()
        .from('entities')
        .select('slug')
        .eq('id', id as string)
        .single();
      if (entity?.slug) {
        try { canonicalRestaurant = await getRestaurantById(entity.slug); } catch { /* give up */ }
      }
    }
    return ok({ success, restaurant: canonicalRestaurant || { id } });
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
      revalidatePath("/[area]/restaurant/[id]", "page");
    }
    return ok({ success });
  } catch (err) {
    return serverError(err);
  }
}
