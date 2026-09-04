import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { appendFaq, updateFaq, deleteFaq, getAdminFaqs, getAdminOptions } from "@/lib/google-sheets";
import crypto from "crypto";

/** GET: 관리자용 전체 질문 조회 (숨김 포함) */
export async function GET(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const area = searchParams.get("area") || undefined;
    const category = searchParams.get("category") || undefined;

    if (!area || !category) {
      return NextResponse.json({ error: "area, category 파라미터가 필요합니다" }, { status: 400 });
    }

    const options = await getAdminOptions();
    const currentArea = options.find(
      (o) => o.option_type === "AREA" && o.code.toLowerCase() === area && o.active !== "FALSE"
    );
    if (!currentArea) {
      return NextResponse.json({ error: "존재하지 않는 지역입니다" }, { status: 404 });
    }

    const currentCategory = options.find(
      (o) => o.option_type === "CATEGORY" && o.code.toLowerCase() === category && o.active !== "FALSE"
    );
    if (!currentCategory) {
      return NextResponse.json({ error: "존재하지 않는 카테고리입니다" }, { status: 404 });
    }

    const areaCode = currentArea.code;
    const categoryCode = currentCategory.code;

    const faqs = await getAdminFaqs(areaCode === "ALL" ? undefined : areaCode, categoryCode);
    const filtered = areaCode === "ALL" ? faqs.filter((f) => f.area === "ALL") : faqs;

    return NextResponse.json({ faqs: filtered });
  } catch {
    return NextResponse.json({ error: "질문 목록 조회에 실패했습니다" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { area, category, question_scope, question, answer, active, related_type, related_id, related_name } = body;

    if (!area || !category || !question_scope || !question || !answer) {
      return NextResponse.json({ error: "필수 값이 누락되었습니다" }, { status: 400 });
    }

    if (question_scope === "SPECIFIC" && (!related_type || !related_id)) {
      return NextResponse.json({ error: "특정 장소를 선택하세요" }, { status: 400 });
    }

    // Generate ID
    const id = `faq_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    // Get max sort for this group
    const { getFaq } = await import("@/lib/google-sheets");
    const existingFaqs = await getFaq(area.toUpperCase() === "ALL" ? undefined : area.toUpperCase(), category.toUpperCase());
    const maxSort = existingFaqs.reduce((max, f) => Math.max(max, f.sort), 0);

    const data: Record<string, string | number> = {
      id,
      area: area.toUpperCase(),
      category: category.toUpperCase(),
      question_scope,
      question,
      answer,
      active: active || "TRUE",
      sort: maxSort + 1,
      related_type: related_type || "",
      related_id: related_id || "",
      related_name: related_name || "",
      source_url: "",
      status: "",
    };

    const success = await appendFaq(data);
    if (success) {
      return NextResponse.json({ success: true, id });
    }
    return NextResponse.json({ error: "저장에 실패했습니다" }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "저장 중 문제가 발생했습니다" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, area, category, question_scope, question, answer, active, related_type, related_id, related_name } = body;

    if (!id || !area || !category || !question_scope || !question || !answer) {
      return NextResponse.json({ error: "필수 값이 누락되었습니다" }, { status: 400 });
    }

    // Get existing data to preserve sort and other fields
    let existingSort = 1;
    let existingStatus = "";
    let existingSourceUrl = "";
    try {
      const { getFaqById } = await import("@/lib/google-sheets");
      const existing = await getFaqById(id);
      if (existing) {
        existingSort = existing.sort;
        existingStatus = existing.status;
        existingSourceUrl = existing.source_url;
      }
    } catch {
      // fallback
    }

    const data: Record<string, string | number> = {
      id,
      area: area.toUpperCase(),
      category: category.toUpperCase(),
      question_scope,
      question,
      answer,
      active: active || "TRUE",
      sort: existingSort,
      related_type: related_type || "",
      related_id: related_id || "",
      related_name: related_name || "",
      source_url: existingSourceUrl,
      status: existingStatus,
    };

    const success = await updateFaq(0, data);
    if (success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "저장에 실패했습니다" }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "저장 중 문제가 발생했습니다" }, { status: 500 });
  }
}

/** DELETE: 질문 원본 시트에서 실제 삭제 */
export async function DELETE(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id가 필요합니다" }, { status: 400 });
    }

    const success = await deleteFaq(id);
    if (success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "삭제 대상을 찾을 수 없습니다" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "삭제 중 문제가 발생했습니다" }, { status: 500 });
  }
}