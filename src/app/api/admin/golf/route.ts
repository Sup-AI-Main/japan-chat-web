import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getGolfCourses, appendGolfCourse, updateGolfCourse, deleteGolfCourse } from "@/lib/supabase-cms";
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
    if (!body.active) body.active = "TRUE";
    const { id, slug } = await appendGolfCourse(body);
    const area = (body.area || '').toLowerCase();
    if (area) {
      revalidatePath(`/${area}/golf`);
      revalidatePath(`/${area}/golf/${slug}`);
      revalidatePath("/[area]/golf/[id]", "page");
    }
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
  const { id, updated_at, area, ...data } = body;
  if (!id) return badRequest("Missing id");
  try {
    const success = await updateGolfCourse(id, data, updated_at);
    if (area) {
      revalidatePath(`/${area.toLowerCase()}/golf`);
      revalidatePath("/[area]/golf/[id]", "page");
    }
    return ok({ success, course: { ...data, id } });
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
