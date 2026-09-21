import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getHotels, appendHotel, updateHotel, deleteHotel, validateRequiredFields, getHotelByEntityIdAdmin } from "@/lib/supabase-cms";
import { ConflictError } from "@/lib/types";
import { ok, created, badRequest, conflict, notFound, serverError, safeJson } from "@/lib/crud/response";
import { revalidatePath } from "next/cache";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  try {
    const area = req.nextUrl.searchParams.get("area") || undefined;
    const hotels = await getHotels(area || undefined);
    return ok({ hotels });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  try {
    const body = await safeJson<Record<string, string>>(req);
    if (!body) return badRequest("Empty request body");

    // Server-side required field validation
    const validationError = await validateRequiredFields("HOTEL", body);
    if (validationError) return badRequest(validationError);

    if (!body.active) body.active = "TRUE";
    const { id, slug } = await appendHotel(body);
    const area = (body.area || '').toLowerCase();
    if (area) {
      revalidatePath(`/${area}/hotel`);
      revalidatePath(`/${area}/hotel/${slug}`);
      revalidatePath("/[area]/hotel/[id]", "page");
    }
    // Return canonical persisted row from DB
    const canonicalHotel = await getHotelByEntityIdAdmin(id);
    if (!canonicalHotel) {
      console.error("[HOTEL_CANONICAL_READ_FAILED]", id);
      return serverError(new Error("Hotel created but canonical read failed"));
    }
    return created({ id, slug, hotel: canonicalHotel });
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  const body = await safeJson<Record<string, string>>(req);
  if (!body) return badRequest("Empty request body");

  // Server-side required field validation
  const validationError = await validateRequiredFields("HOTEL", body);
  if (validationError) return badRequest(validationError);

  const { id, updated_at, area, ...data } = body;
  if (!id) return badRequest("Missing id");
  try {
    const success = await updateHotel(id, data, updated_at);
    if (!success) return notFound("Hotel not found");
    if (area) {
      revalidatePath(`/${area.toLowerCase()}/hotel`);
      revalidatePath("/[area]/hotel/[id]", "page");
    }
    // Return canonical persisted row from DB
    const canonicalHotel = await getHotelByEntityIdAdmin(id);
    if (!canonicalHotel) {
      console.error("[HOTEL_CANONICAL_READ_FAILED]", id);
      return serverError(new Error("Hotel updated but canonical read failed"));
    }
    return ok({ success, hotel: canonicalHotel });
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
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return badRequest("Missing id");
    const area = req.nextUrl.searchParams.get("area") || "";
    const success = await deleteHotel(id);
    if (!success) return notFound("Hotel not found");
    if (area) {
      revalidatePath(`/${area.toLowerCase()}/hotel`);
      revalidatePath("/[area]/hotel/[id]", "page");
    }
    return ok({ success });
  } catch (err) {
    return serverError(err);
  }
}
