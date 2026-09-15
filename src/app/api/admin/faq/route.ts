import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { appendFaq, updateFaq, deleteFaq, getAdminFaqs, getAdminOptions } from "@/lib/supabase-cms";
import { ok, created, badRequest, notFound, serverError, safeJson } from "@/lib/crud/response";
import { getSupabaseServer } from "@/lib/supabase/server";

async function validateRelatedEntity(
  relatedId: string,
  relatedType: string,
  areaCode: string
): Promise<string | null> {
  const { data: entity } = await getSupabaseServer()
    .from("entities")
    .select("id, entity_type, area_id, areas!inner(code)")
    .eq("id", relatedId)
    .single();
  if (!entity) return "연결된 항목을 찾을 수 없습니다";
  const entityAreaCode = (entity.areas as unknown as { code: string })?.code;
  if (entity.entity_type !== relatedType) {
    return `연결 유형이 일치하지 않습니다: 기대 ${relatedType}, 실제 ${entity.entity_type}`;
  }
  if (entityAreaCode && entityAreaCode !== areaCode) {
    return `연결 항목이 현재 지역(${areaCode})에 속하지 않습니다`;
  }
  return null;
}

/** GET: 관리자용 전체 질문 조회 (숨김 포함) */
export async function GET(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const area = searchParams.get("area") || undefined;
    const category = searchParams.get("category") || undefined;

    if (!area || !category) {
      return badRequest("area, category 파라미터가 필요합니다");
    }

    const options = await getAdminOptions();
    const areaUp = area.toUpperCase();
    const catUp = category.toUpperCase();
    const currentArea = options.find(
      (o) => o.option_type === "AREA" && o.code === areaUp && o.active !== "FALSE"
    );
    if (!currentArea) {
      return notFound("존재하지 않는 지역입니다");
    }

    const currentCategory = options.find(
      (o) => o.option_type === "CATEGORY" && o.code === catUp && o.active !== "FALSE"
    );
    if (!currentCategory) {
      return notFound("존재하지 않는 카테고리입니다");
    }

    const areaCode = currentArea.code;
    const categoryCode = currentCategory.code;

    const faqs = await getAdminFaqs(areaCode === "ALL" ? undefined : areaCode, categoryCode);
    const filtered = areaCode === "ALL" ? faqs.filter((f) => f.area === "ALL") : faqs;

    return ok({ faqs: filtered });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await safeJson<Record<string, string>>(request);
    if (!body) return badRequest("Empty request body");
    const { area, category, question_scope, question, answer, active, related_type, related_id, related_name } = body;

    if (!area || !category || !question_scope || !question || !answer) {
      return badRequest("필수 값이 누락되었습니다");
    }

    if (question_scope === "SPECIFIC" && (!related_type || !related_id)) {
      return badRequest("특정 장소를 선택하세요");
    }

    if (question_scope === "SPECIFIC" && related_type && related_id) {
      const validationError = await validateRelatedEntity(related_id, related_type, area.toUpperCase());
      if (validationError) return badRequest(validationError);
    }

    // Get max sort for this group
    const { getFaq } = await import("@/lib/supabase-cms");
    const existingFaqs = await getFaq(area.toUpperCase() === "ALL" ? undefined : area.toUpperCase(), category.toUpperCase());
    const maxSort = existingFaqs.reduce((max, f) => Math.max(max, f.sort), 0);

    const data: Record<string, string> = {
      area: area.toUpperCase(),
      category: category.toUpperCase(),
      question_scope,
      question,
      answer,
      active: active || "TRUE",
      sort: String(maxSort + 1),
      related_type: related_type || "",
      related_id: related_id || "",
      related_name: related_name || "",
      source_url: "",
      status: "",
    };

    const id = await appendFaq(data);
    if (id) {
      return created({ id });
    }
    return serverError(new Error("저장에 실패했습니다"));
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await safeJson<Record<string, string>>(request);
    if (!body) return badRequest("Empty request body");
    const { id, area, category, question_scope, question, answer, active, related_type, related_id, related_name } = body;

    if (!id || !area || !category || !question_scope || !question || !answer) {
      return badRequest("필수 값이 누락되었습니다");
    }

    if (question_scope === "SPECIFIC" && related_type && related_id) {
      const validationError = await validateRelatedEntity(related_id, related_type, area.toUpperCase());
      if (validationError) return badRequest(validationError);
    }

    // Get existing data to preserve sort and other fields
    let existingSort = 1;
    let existingStatus = "";
    let existingSourceUrl = "";
    try {
      const { getFaqById } = await import("@/lib/supabase-cms");
      const existing = await getFaqById(id);
      if (existing) {
        existingSort = existing.sort;
        existingStatus = existing.status;
        existingSourceUrl = existing.source_url;
      }
    } catch {
      // fallback
    }

    const data: Record<string, string> = {
      id,
      area: area.toUpperCase(),
      category: category.toUpperCase(),
      question_scope,
      question,
      answer,
      active: active || "TRUE",
      sort: String(existingSort),
      related_type: related_type || "",
      related_id: related_id || "",
      related_name: related_name || "",
      source_url: existingSourceUrl,
      status: existingStatus,
    };

    const success = await updateFaq(0, data);
    if (success) {
      return ok({ success: true });
    }
    return serverError(new Error("저장에 실패했습니다"));
  } catch (err) {
    return serverError(err);
  }
}

/** DELETE: 질문 원본 시트에서 실제 삭제 */
export async function DELETE(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await safeJson<Record<string, string>>(request);
    if (!body) return badRequest("Empty request body");
    const { id } = body;

    if (!id) {
      return badRequest("id가 필요합니다");
    }

    const success = await deleteFaq(id);
    if (success) {
      return ok({ success: true });
    }
    return notFound("삭제 대상을 찾을 수 없습니다");
  } catch (err) {
    return serverError(err);
  }
}
