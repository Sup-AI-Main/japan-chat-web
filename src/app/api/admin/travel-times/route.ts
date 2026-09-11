import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  getTravelTimes,
  appendTravelTime,
  updateTravelTime,
  deleteTravelTime,
} from "@/lib/supabase-cms";
import { ok, created, badRequest, conflict, serverError, safeJson } from "@/lib/crud/response";

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const area = request.nextUrl.searchParams.get("area") || undefined;
  const times = await getTravelTimes(area);
  return ok({ travelTimes: times });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await safeJson<Record<string, string>>(request);
    if (!body) return badRequest("Empty request body");
    const { area, from_id, to_id, verified_drive_min, directions_url, sort } = body;

    if (!area || !from_id || !to_id) {
      return badRequest("area, from_id, to_id 필수");
    }

    const newId = await appendTravelTime({
      area: area.toUpperCase(),
      hotel_id: from_id,
      golf_id: to_id,
      verified_drive_min: verified_drive_min || "",
      directions_url: directions_url || "",
      sort: sort || "999",
      active: body.active || "TRUE",
    });

    if (!newId) {
      return serverError(new Error("생성 실패"));
    }

    return created({ id: newId });
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await safeJson<Record<string, string>>(request);
    if (!body) return badRequest("Empty request body");
    const { id, updated_at } = body;

    if (!id) {
      return badRequest("id 필수");
    }

    const success = await updateTravelTime({ ...body, updated_at: updated_at || "" });
    if (!success) {
      return serverError(new Error("수정 실패"));
    }

    return ok({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "409_CONFLICT") {
      return conflict("다른 관리자가 먼저 수정했습니다. 최신 데이터를 다시 불러와 주세요.");
    }
    return serverError(error);
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return badRequest("id 필수");
  }

  const success = await deleteTravelTime(id);
  if (!success) {
    return serverError(new Error("삭제 실패"));
  }

  return ok({ success: true });
}
