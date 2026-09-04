import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { updateAdminOptionSort } from "@/lib/google-sheets";

export async function PATCH(request: Request) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { option_type, ids } = body;

    if (!option_type || !ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "option_type과 ids 배열이 필요합니다." }, { status: 400 });
    }

    const success = await updateAdminOptionSort(option_type, ids);

    if (success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "정렬 저장에 실패했습니다." }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
