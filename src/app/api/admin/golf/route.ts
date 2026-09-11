import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getGolfCourses, appendGolfCourse, updateGolfCourse, deleteGolfCourse } from "@/lib/supabase-cms";
import { ConflictError } from "@/lib/types";
import { ok, created, badRequest, conflict, serverError, safeJson } from "@/lib/crud/response";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  const area = req.nextUrl.searchParams.get("area") || undefined;
  const courses = await getGolfCourses(area || undefined);
  return ok({ courses });
}

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  try {
    const body = await safeJson<Record<string, string>>(req);
    if (!body) return badRequest("Empty request body");
    if (!body.active) body.active = "TRUE";
    const { id, slug } = await appendGolfCourse(body);
    return created({ id, slug, course: { ...body, id, slug } });
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
    const success = await updateGolfCourse(id, data, updated_at);
    return ok({ success, course: { ...data, id } });
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
  const success = await deleteGolfCourse(id);
  return ok({ success });
}
