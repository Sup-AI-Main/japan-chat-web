import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { updateFaq } from "@/lib/google-sheets";

export async function PATCH(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, active } = body;

    if (!id || !active) {
      return NextResponse.json({ error: "필수 값이 누락되었습니다" }, { status: 400 });
    }

    const success = await updateFaq(0, { id, active });
    if (success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "저장에 실패했습니다" }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "처리 중 문제가 발생했습니다" }, { status: 500 });
  }
}