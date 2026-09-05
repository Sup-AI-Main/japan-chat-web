import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  getTravelTimes,
  appendTravelTime,
  updateTravelTime,
  deleteTravelTime,
} from "@/lib/google-sheets";

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const area = request.nextUrl.searchParams.get("area") || undefined;
  const times = await getTravelTimes(area);
  return NextResponse.json({ travelTimes: times });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { area, from_id, to_id, verified_drive_min, directions_url, sort } = body;

    if (!area || !from_id || !to_id) {
      return NextResponse.json(
        { error: "area, from_id, to_id 필수" },
        { status: 400 }
      );
    }

    const newId = await appendTravelTime({
      area: area.toUpperCase(),
      from_id,
      to_id,
      verified_drive_min: verified_drive_min || "",
      directions_url: directions_url || "",
      sort: sort ?? 999,
    });

    if (!newId) {
      return NextResponse.json({ error: "생성 실패" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: newId });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, updated_at } = body;

    if (!id) {
      return NextResponse.json({ error: "id 필수" }, { status: 400 });
    }

    const success = await updateTravelTime({ ...body, updated_at: updated_at || "" });
    if (!success) {
      return NextResponse.json({ error: "수정 실패" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "409_CONFLICT") {
      return NextResponse.json(
        { error: "다른 관리자가 먼저 수정했습니다. 최신 데이터를 다시 불러와 주세요." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id 필수" }, { status: 400 });
  }

  const success = await deleteTravelTime(id);
  if (!success) {
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}