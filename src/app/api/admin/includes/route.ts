import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  getIncludesExcludes,
  appendIncludeExclude,
  updateIncludeExclude,
  deleteIncludeExclude,
} from "@/lib/supabase-cms";
import { ConflictError } from "@/lib/types";
import { ok, created, badRequest, conflict, notFound, serverError, safeJson } from "@/lib/crud/response";
import { findContentParentId, revalidateEntityById } from "@/lib/revalidate-labels";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  try {
    const parentType = req.nextUrl.searchParams.get("parent_type") || undefined;
    const parentId = req.nextUrl.searchParams.get("parent_id") || undefined;
    const items = await getIncludesExcludes(parentType, parentId, true);
    return ok({ items });
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
    const row = await appendIncludeExclude(body);
    if (typeof row.parent_entity_id === "string") await revalidateEntityById(row.parent_entity_id);
    return created(row);
  } catch (err) {
    return serverError(err);
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
    const parentId = await findContentParentId("includes_excludes", id);
    const success = await updateIncludeExclude(id, data, updated_at);
    if (success && parentId) await revalidateEntityById(parentId);
    return ok({ success });
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
    const parentId = await findContentParentId("includes_excludes", id);
    const success = await deleteIncludeExclude(id);
    if (!success) return notFound("Include/exclude not found");
    if (parentId) await revalidateEntityById(parentId);
    return ok({ deleted: success, id });
  } catch (err) {
    return serverError(err);
  }
}
