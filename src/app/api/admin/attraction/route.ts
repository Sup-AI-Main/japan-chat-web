import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getAttractions, getAttractionByEntityIdAdmin, appendAttraction, updateAttraction, deleteAttraction, MigratedDetailFieldError } from "@/lib/supabase-cms";
import { ConflictError } from "@/lib/types";
import { ok, created, badRequest, conflict, notFound, serverError, safeJson } from "@/lib/crud/response";
import { revalidatePath } from "next/cache";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  try {
    // Single entity by id → canonical DTO
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const attraction = await getAttractionByEntityIdAdmin(id);
      if (!attraction) return notFound("Attraction not found");
      return ok({ attraction });
    }
    const area = req.nextUrl.searchParams.get("area") || undefined;
    const attractions = await getAttractions(area || undefined);
    return ok({ attractions });
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
    if (!body.active) body.active = "TRUE";
    const { id, slug } = await appendAttraction(body as Record<string, string>);
    const areaCode = (body.area as string || '').toLowerCase();
    if (areaCode) {
      revalidatePath(`/${areaCode}/attraction`);
      revalidatePath(`/${areaCode}/attraction/${slug}`);
    }
    // Return canonical persisted row from DB
    const canonicalAttraction = await getAttractionByEntityIdAdmin(id);
    if (!canonicalAttraction) {
      console.error("[ATTRACTION_CANONICAL_READ_FAILED]", id);
      return serverError(new Error("Attraction created but canonical read failed"));
    }
    return created({ id, slug, attraction: canonicalAttraction });
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
    const success = await updateAttraction(id as string, restData as Record<string, string>, updated_at as string | undefined);
    if (area) {
      revalidatePath(`/${(area as string).toLowerCase()}/attraction`);
    }
    // Return canonical persisted row from DB
    const canonicalAttraction = await getAttractionByEntityIdAdmin(id as string);
    if (!canonicalAttraction) {
      console.error("[ATTRACTION_CANONICAL_READ_FAILED]", id);
      return serverError(new Error("Attraction updated but canonical read failed"));
    }
    return ok({ success, attraction: canonicalAttraction });
  } catch (err) {
    if (err instanceof ConflictError) {
      return conflict(err.message);
    }
    if (err instanceof MigratedDetailFieldError) {
      return badRequest(err.message);
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
    const success = await deleteAttraction(id);
    if (area) {
      revalidatePath(`/${area.toLowerCase()}/attraction`);
    }
    return ok({ success });
  } catch (err) {
    return serverError(err);
  }
}
