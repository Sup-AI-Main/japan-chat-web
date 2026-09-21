import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getRestaurants, appendRestaurant, updateRestaurant, deleteRestaurantRow, validateRequiredFields, getRestaurantByEntityIdAdmin } from "@/lib/supabase-cms";
import { ConflictError } from "@/lib/types";
import { ok, created, badRequest, conflict, notFound, serverError, safeJson } from "@/lib/crud/response";
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
    const { id, slug } = await appendRestaurant(body);
    const areaCode = (body.area as string || '').toLowerCase();
    if (areaCode) {
      revalidatePath(`/${areaCode}/restaurant`);
      revalidatePath(`/${areaCode}/restaurant/${slug}`);
      revalidatePath("/[area]/restaurant/[id]", "page");
    }
    // Return canonical persisted row from DB
    const canonicalRestaurant = await getRestaurantByEntityIdAdmin(id);
    if (!canonicalRestaurant) {
      console.error("[RESTAURANT_CANONICAL_READ_FAILED]", id);
      return serverError(new Error("Restaurant created but canonical read failed"));
    }
    return created({ id, slug, restaurant: canonicalRestaurant });
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
    const success = await updateRestaurant(id as string, restData, updated_at as string | undefined);
    if (!success) return notFound("Restaurant not found");
    if (area) {
      revalidatePath(`/${(area as string).toLowerCase()}/restaurant`);
      revalidatePath("/[area]/restaurant/[id]", "page");
    }
    // Return canonical persisted row from DB
    const canonicalRestaurant = await getRestaurantByEntityIdAdmin(id as string);
    if (!canonicalRestaurant) {
      console.error("[RESTAURANT_CANONICAL_READ_FAILED]", id);
      return serverError(new Error("Restaurant updated but canonical read failed"));
    }
    return ok({ success, restaurant: canonicalRestaurant });
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
    if (!success) return notFound("Restaurant not found");
    if (area) {
      revalidatePath(`/${area.toLowerCase()}/restaurant`);
      revalidatePath("/[area]/restaurant/[id]", "page");
    }
    return ok({ success });
  } catch (err) {
    return serverError(err);
  }
}
