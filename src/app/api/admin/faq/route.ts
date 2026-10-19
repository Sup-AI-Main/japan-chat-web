import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { appendFaq, updateFaq, deleteFaq, getAdminFaqs, getAdminOptions, getFaqEntityOptions, getFaqById } from "@/lib/supabase-cms";
import { ok, created, badRequest, notFound, serverError, safeJson } from "@/lib/crud/response";

function revalidateFaq(faq: { area: string; category: string; related_id: string }) {
  if (faq.area === "ALL") return;
  const area = faq.area.toLowerCase();
  revalidatePath(`/${area}`);
  revalidatePath(`/${area}/${faq.category.toLowerCase()}`);
  if (faq.related_id) revalidatePath(`/${area}/${faq.category.toLowerCase()}/${faq.related_id}`);
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

    if (searchParams.has("options")) {
      const options = await getAdminOptions();
      const areas = options.filter((option) => option.option_type === "AREA" && option.active !== "FALSE");
      const categories = options.filter((option) => option.option_type === "CATEGORY" && option.group === "AREA" && option.active !== "FALSE" && ["GOLF", "HOTEL", "RESTAURANT", "ATTRACTION"].includes(option.template_type || ""));
      const selectedCategory = categories.find((option) => option.code === category?.toUpperCase());
      const entities = area && selectedCategory ? await getFaqEntityOptions(area.toUpperCase(), selectedCategory.template_type || "") : [];
      return ok({ areas, categories, entities });
    }

    if (!area) {
      return badRequest("area 파라미터가 필요합니다");
    }

    const options = await getAdminOptions();
    const areaUp = area.toUpperCase();
    const catUp = category?.toUpperCase();
    const currentArea = options.find(
      (o) => o.option_type === "AREA" && o.code === areaUp && o.active !== "FALSE"
    );
    if (!currentArea) {
      return notFound("존재하지 않는 지역입니다");
    }

    if (category) {
      const currentCategory = options.find(
        (o) => o.option_type === "CATEGORY" && o.code === catUp && o.active !== "FALSE"
      );
      if (!currentCategory) return notFound("존재하지 않는 카테고리입니다");
    }

    const areaCode = currentArea.code;
    const categoryCode = category ? catUp : undefined;

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
      revalidateFaq({ area: data.area, category: data.category, related_id: data.related_id });
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

    // Preserve sort and source fields for the existing FAQ.
    const previous = await getFaqById(id);
    if (!previous) return notFound("수정 대상을 찾을 수 없습니다");

    const data: Record<string, string> = {
      id,
      area: area.toUpperCase(),
      category: category.toUpperCase(),
      question_scope,
      question,
      answer,
      active: active || "TRUE",
      sort: String(previous.sort || 1),
      related_type: related_type || "",
      related_id: related_id || "",
      related_name: related_name || "",
      source_url: previous.source_url,
      status: previous.status,
    };

    const success = await updateFaq(0, data);
    if (success) {
      revalidateFaq(previous);
      revalidateFaq({ area: data.area, category: data.category, related_id: data.related_id });
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

    const previous = await getFaqById(id);
    const success = await deleteFaq(id);
    if (success) {
      if (previous) revalidateFaq(previous);
      return ok({ deleted: true, id });
    }
    return notFound("삭제 대상을 찾을 수 없습니다");
  } catch (err) {
    return serverError(err);
  }
}
