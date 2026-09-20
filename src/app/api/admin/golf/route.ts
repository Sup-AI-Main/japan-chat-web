import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getGolfCourses, getGolfCourseById, appendGolfCourse, updateGolfCourse, deleteGolfCourse, validateRequiredFields } from "@/lib/supabase-cms";
import { getSupabaseServer } from "@/lib/supabase/server";
import { ConflictError } from "@/lib/types";
import { ok, created, badRequest, conflict, serverError, safeJson } from "@/lib/crud/response";
import { revalidatePath } from "next/cache";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  try {
    const area = req.nextUrl.searchParams.get("area") || undefined;
    const courses = await getGolfCourses(area || undefined);
    return ok({ courses });
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
    const validationError = await validateRequiredFields("GOLF", body);
    if (validationError) return badRequest(validationError);

    if (!body.active) body.active = "TRUE";
    const { id, slug } = await appendGolfCourse(body);
    const area = (body.area || '').toLowerCase();
    if (area) {
      revalidatePath(`/${area}/golf`);
      revalidatePath(`/${area}/golf/${slug}`);
      revalidatePath("/[area]/golf/[id]", "page");
    }
    // Return canonical persisted row from DB
    let canonicalCourse = null;
    try {
      canonicalCourse = await getGolfCourseById(slug);
    } catch { /* fallback to basic response */ }
    return created({ id, slug, course: canonicalCourse || { id, slug } });
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
  const validationError = await validateRequiredFields("GOLF", body);
  if (validationError) return badRequest(validationError);

  const { id, updated_at, area, ...data } = body;
  if (!id) return badRequest("Missing id");
  try {
    const success = await updateGolfCourse(id, data, updated_at);
    if (area) {
      revalidatePath(`/${area.toLowerCase()}/golf`);
      revalidatePath("/[area]/golf/[id]", "page");
    }
    // Return canonical persisted row from DB (resolve slug from entity UUID)
    let canonicalCourse = null;
    try {
      const { data: entity } = await getSupabaseServer()
        .from('entities')
        .select('slug')
        .eq('id', id)
        .single();
      if (entity?.slug) {
        canonicalCourse = await getGolfCourseById(entity.slug);
      }
    } catch { /* fallback to basic response */ }
    return ok({ success, course: canonicalCourse || { id } });
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
    const success = await deleteGolfCourse(id);
    if (area) {
      revalidatePath(`/${area.toLowerCase()}/golf`);
      revalidatePath("/[area]/golf/[id]", "page");
    }
    return ok({ success });
  } catch (err) {
    return serverError(err);
  }
}
