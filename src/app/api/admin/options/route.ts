import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  getAdminOptions,
  appendAdminOption,
  updateAdminOption,
} from "@/lib/supabase-cms";
import { ok, created, badRequest, notFound, duplicateCode, serverError, safeJson } from "@/lib/crud/response";
import { deleteCategoryFull, deleteAreaFull } from "@/lib/crud/compound-delete";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });

  try {
    const options = await getAdminOptions();
    return ok({ options });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });

  try {
    const body = await safeJson<Record<string, string>>(request);
    if (!body) return badRequest("Empty request body");
    const { option_type, label, group, icon, description } = body;

    if (!option_type || !label) {
      return badRequest("option_type과 label은 필수입니다.");
    }

    if (option_type === "CATEGORY" && !group) {
      return badRequest("CATEGORY 옵션에는 group 필드가 필수입니다. (AREA 또는 COMMON)");
    }

    const options = await getAdminOptions();
    const sameType = options.filter((o) => o.option_type === option_type);
    const maxSort = sameType.reduce((max, o) => Math.max(max, o.sort), 0);

    const code = option_type === "AREA"
      ? label.replace(/\s+/g, "").toUpperCase().slice(0, 20)
      : label.replace(/\s+/g, "_").toUpperCase().slice(0, 20);

    const option = await appendAdminOption({
      option_type,
      code,
      label,
      icon: icon || "📌",
      description: description || "",
      group: group || "",
      active: "TRUE",
      sort: String(maxSort + 1),
    });

    if (option?.id) {
      return created({ id: option.id, option });
    }
    return serverError(new Error("저장에 실패했습니다."));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/admin/options] error:", msg);
    const code = (err as Record<string, unknown>)?.code;
    if (code === "23505" || String(msg).includes("duplicate")) {
      return duplicateCode("같은 이름/코드의 항목이 이미 존재합니다.");
    }
    return serverError(err);
  }
}

export async function PUT(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });

  try {
    const body = await safeJson<Record<string, string>>(request);
    if (!body) return badRequest("Empty request body");
    const { id, label, icon, description } = body;

    if (!id || !label) {
      return badRequest("id와 label은 필수입니다.");
    }

    const updateData: Record<string, string> = { id, label };
    if (icon !== undefined) updateData.icon = icon;
    if (description !== undefined) updateData.description = description;
    const success = await updateAdminOption(updateData);

    if (success) {
      return ok({ success: true });
    }
    return serverError(new Error("수정에 실패했습니다."));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[PUT /api/admin/options] error:", msg);
    return serverError(err);
  }
}

export async function DELETE(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return badRequest("id 필수");
    }

    // A18: ID로 종류를 확인한 후 실제 DELETE 수행
    const db = getSupabaseAdmin();

    // 카테고리인지 확인
    const { data: cat } = await db.from("categories").select("id").eq("id", id).maybeSingle();
    if (cat) {
      await deleteCategoryFull(id, true);
      return ok({ deleted: true, id });
    }

    // 지역인지 확인
    const { data: area } = await db.from("areas").select("id").eq("id", id).maybeSingle();
    if (area) {
      await deleteAreaFull(id, true);
      return ok({ deleted: true, id });
    }

    return notFound("해당 항목을 찾을 수 없습니다.");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[DELETE /api/admin/options] error:", msg);
    return serverError(err);
  }
}
