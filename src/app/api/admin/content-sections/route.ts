import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  getContentSections,
  appendContentSection,
  updateContentSection,
  deleteContentSection,
} from "@/lib/supabase-cms";
import { ConflictError } from "@/lib/types";
import { ok, created, badRequest, conflict, serverError, safeJson } from "@/lib/crud/response";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  try {
    const parentType = req.nextUrl.searchParams.get("parent_type") || undefined;
    const parentId = req.nextUrl.searchParams.get("parent_id") || undefined;
    const sections = await getContentSections(parentType, parentId, true);
    return ok({ sections });
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
    const { parent_type, parent_id, parent_entity_id, title, content, emoji, sort } = body;
    if (!title) {
      return badRequest("Missing required field: title");
    }
    if (!parent_entity_id && (!parent_type || !parent_id)) {
      return badRequest("Missing required fields: either parent_entity_id or (parent_type + parent_id)");
    }
    const row = await appendContentSection({
      parent_type: parent_type || "",
      parent_id: parent_id || "",
      parent_entity_id: parent_entity_id || "",
      title,
      content: content || "",
      emoji: emoji || "",
      sort: sort || "",
    });
    return created(row);
  } catch (err) {
    console.error("CONTENT_SECTION_CREATE_FAIL", err);
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
    const success = await updateContentSection(id, data, updated_at);
    return ok({ success });
  } catch (err) {
    if (err instanceof ConflictError) {
      return conflict(err.message);
    }
    console.error("CONTENT_SECTION_UPDATE_FAIL", err);
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
    const success = await deleteContentSection(id);
    return ok({ success });
  } catch (err) {
    console.error("CONTENT_SECTION_DELETE_FAIL", err);
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
