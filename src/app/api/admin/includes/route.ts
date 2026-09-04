import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  getIncludesExcludes,
  appendIncludeExclude,
  updateIncludeExclude,
  deleteIncludeExclude,
} from "@/lib/google-sheets";
import { ConflictError } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parentType = req.nextUrl.searchParams.get("parent_type") || undefined;
  const parentId = req.nextUrl.searchParams.get("parent_id") || undefined;
  const items = await getIncludesExcludes(parentType, parentId);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const id = await appendIncludeExclude(body);
  return NextResponse.json({ id }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, updated_at, ...data } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    const ok = await updateIncludeExclude(id, data, updated_at);
    return NextResponse.json({ success: ok });
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
  const ok = await deleteIncludeExclude(id);
  return NextResponse.json({ success: ok });
}
