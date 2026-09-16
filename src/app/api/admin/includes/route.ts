import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  getIncludesExcludes,
  appendIncludeExclude,
  updateIncludeExclude,
  deleteIncludeExclude,
} from "@/lib/supabase-cms";
import { ConflictError } from "@/lib/types";
import { ok, created, badRequest, conflict, safeJson } from "@/lib/crud/response";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  const parentType = req.nextUrl.searchParams.get("parent_type") || undefined;
  const parentId = req.nextUrl.searchParams.get("parent_id") || undefined;
  const items = await getIncludesExcludes(parentType, parentId, true);
  return ok({ items });
}

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  try {
    const body = await safeJson<Record<string, string>>(req);
    if (!body) return badRequest("Empty request body");
    const row = await appendIncludeExclude(body);
    return created(row);
  } catch (err) {
    console.error("INCLUDES_CREATE_FAIL", err);
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  try {
    const body = await safeJson<Record<string, string>>(req);
    if (!body) return badRequest("Empty request body");
    const { id, updated_at, ...data } = body;
    if (!id) return badRequest("Missing id");
    const success = await updateIncludeExclude(id, data, updated_at);
    return ok({ success });
  } catch (err) {
    if (err instanceof ConflictError) {
      return conflict(err.message);
    }
    console.error("INCLUDES_UPDATE_FAIL", err);
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return badRequest("Missing id");
    const success = await deleteIncludeExclude(id);
    return ok({ success });
  } catch (err) {
    console.error("INCLUDES_DELETE_FAIL", err);
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
