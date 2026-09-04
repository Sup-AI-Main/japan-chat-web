import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  getAdminOptions,
  appendAdminOption,
  updateAdminOption,
} from "@/lib/google-sheets";

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const options = await getAdminOptions();
    return NextResponse.json({ options });
  } catch {
    return NextResponse.json({ error: "Failed to fetch options" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { option_type, label } = body;

    if (!option_type || !label) {
      return NextResponse.json({ error: "option_type과 label은 필수입니다." }, { status: 400 });
    }

    const options = await getAdminOptions();
    const sameType = options.filter((o) => o.option_type === option_type);
    const maxSort = sameType.reduce((max, o) => Math.max(max, o.sort), 0);

    const code = option_type === "AREA"
      ? label.replace(/\s+/g, "").toUpperCase().slice(0, 10)
      : label.replace(/\s+/g, "_").toUpperCase().slice(0, 20);

    const id = `opt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    const success = await appendAdminOption({
      id,
      option_type,
      code,
      label,
      active: "TRUE",
      sort: maxSort + 1,
    });

    if (success) {
      return NextResponse.json({ success: true, id });
    }
    return NextResponse.json({ error: "저장에 실패했습니다." }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, label } = body;

    if (!id || !label) {
      return NextResponse.json({ error: "id와 label은 필수입니다." }, { status: 400 });
    }

    const success = await updateAdminOption({ id, label });

    if (success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "수정에 실패했습니다." }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
