import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getAttractions, appendAttraction, updateAttraction, deleteAttraction } from "@/lib/supabase-cms";
import { ConflictError } from "@/lib/types";
import { ok, created, badRequest, conflict, serverError, safeJson } from "@/lib/crud/response";
import { revalidatePath } from "next/cache";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  try {
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
    const attraction = { ...body, id, slug };
    revalidatePath(`/${(body.area as string || '').toLowerCase()}/attraction`);
    return created({ id, slug, attraction });
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
    const attraction = { ...body };
    if (area) revalidatePath(`/${(area as string).toLowerCase()}/attraction`);
    return ok({ success, attraction });
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
    const success = await deleteAttraction(id);
    if (area) {
      revalidatePath(`/${area.toLowerCase()}/attraction`);
    }
    return ok({ success });
  } catch (err) {
    return serverError(err);
  }
}
