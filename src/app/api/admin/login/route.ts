import { NextRequest, NextResponse } from "next/server";
import { login, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "비밀번호를 입력하세요" }, { status: 400 });
    }

    const isValid = await login(password);
    if (!isValid) {
      return NextResponse.json(
        { error: "비밀번호가 올바르지 않습니다" },
        { status: 401 }
      );
    }

    await setAuthCookie();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "로그인 중 문제가 발생했습니다" },
      { status: 500 }
    );
  }
}