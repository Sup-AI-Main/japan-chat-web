import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getGolfCourses, appendGolfCourse, updateGolfCourse, deleteGolfCourse } from "@/lib/google-sheets";
import { ConflictError } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const area = req.nextUrl.searchParams.get("area") || undefined;
  const courses = await getGolfCourses(area || undefined);
  return NextResponse.json({ courses });
}

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const id = await appendGolfCourse(body);
  return NextResponse.json({ id, course: { ...body, id } }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, updated_at, ...data } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    const ok = await updateGolfCourse(id, data, updated_at);
    return NextResponse.json({ success: ok, course: { ...data, id } });
  } catch (err) {
    if (err instanceof ConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const ok = await deleteGolfCourse(id);
  return NextResponse.json({ success: ok });
}
