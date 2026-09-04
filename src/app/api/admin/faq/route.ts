import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { appendFaq, updateFaq, getAdminOptions } from "@/lib/google-sheets";
import crypto from "crypto";

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
    let sortValue = 1;
    try {
      const { google } = await import("googleapis");
      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
      const sheetId = process.env.GOOGLE_SHEET_ID;

      if (email && key && sheetId) {
        const auth = new google.auth.JWT({
          email,
          key,
          scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });
        const sheets = google.sheets({ version: "v4", auth });
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: "faq!A1:Z1000",
        });
        const rows = response.data.values || [];
        if (rows.length > 1) {
          const headers = rows[0].map((h: string) => h.toLowerCase().trim());
          const areaIdx = headers.indexOf("area");
          const catIdx = headers.indexOf("category");
          const sortIdx = headers.indexOf("sort");

          let maxSort = 0;
          for (let i = 1; i < rows.length; i++) {
            if (
              rows[i][areaIdx]?.toUpperCase() === area.toUpperCase() &&
              rows[i][catIdx]?.toUpperCase() === category.toUpperCase()
            ) {
              const s = parseInt(rows[i][sortIdx] || "0", 10);
              if (s > maxSort) maxSort = s;
            }
          }
          sortValue = maxSort + 1;
        }
      }
    } catch {
      sortValue = 1;
    }

    const data: Record<string, string | number> = {
      id,
      area: area.toUpperCase(),
      category: category.toUpperCase(),
      question_scope,
      question,
      answer,
      active: active || "TRUE",
      sort: sortValue,
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