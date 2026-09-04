import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { updateAdminOption } from "@/lib/google-sheets";

export async function PATCH(request: Request) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, active } = body;

    if (!id || !active) {
      return NextResponse.json({ error: "id와 active는 필수입니다." }, { status: 400 });
    }

    const success = await updateAdminOption({ id, active });

    if (success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "처리에 실패했습니다." }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
