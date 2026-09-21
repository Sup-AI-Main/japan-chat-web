import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getGolfCourses, appendGolfCourse, updateGolfCourse, deleteGolfCourse, validateRequiredFields, getGolfCourseByEntityIdAdmin } from "@/lib/supabase-cms";
import { ConflictError } from "@/lib/types";
import { ok, created, badRequest, conflict, notFound, serverError, safeJson } from "@/lib/crud/response";
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
    const canonicalCourse = await getGolfCourseByEntityIdAdmin(id);
    if (!canonicalCourse) {
      console.error("[GOLF_CANONICAL_READ_FAILED]", id);
      return serverError(new Error("Golf course created but canonical read failed"));
    }
    return created({ id, slug, course: canonicalCourse });
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
    if (!success) return notFound("Golf course not found");
    // Return canonical persisted row from DB
    const canonicalCourse = await getGolfCourseByEntityIdAdmin(id);
    if (!canonicalCourse) {
      console.error("[GOLF_CANONICAL_READ_FAILED]", id);
      return serverError(new Error("Golf course updated but canonical read failed"));
    }
    return ok({ success, course: canonicalCourse });
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
    if (!success) return notFound("Golf course not found");
    if (area) {
      revalidatePath(`/${area.toLowerCase()}/golf`);
      revalidatePath("/[area]/golf/[id]", "page");
    }
    return ok({ success });
  } catch (err) {
    return serverError(err);
  }
}
