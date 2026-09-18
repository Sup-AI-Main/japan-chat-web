import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  getTravelTimes,
  appendTravelTime,
  updateTravelTime,
  deleteTravelTime,
} from "@/lib/supabase-cms";
import { ok, created, badRequest, staleVersion, serverError, safeJson } from "@/lib/crud/response";
import { parseTravelTimeInput } from "@/lib/crud/validation";
import { ConflictError } from "@/lib/types";

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const area = request.nextUrl.searchParams.get("area") || undefined;
    const times = await getTravelTimes(area);
    return ok({ travelTimes: times });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await safeJson<Record<string, string>>(request);
    if (!body) return badRequest("Empty request body");
    const { area, from_id, to_id, directions_url, sort } = body;

    if (!area || !from_id || !to_id) {
      return badRequest("area, from_id, to_id 필수");
    }

    // A03: verified_drive_min → product_reference_minutes + display_time 매핑
    const timeInput = body.verified_drive_min || body.product_reference_minutes || "";
    let productMinutes: string | undefined;
    let displayTime: string | undefined;
    let minMinutes: string | undefined;
    let maxMinutes: string | undefined;

    if (timeInput) {
      try {
        const parsed = parseTravelTimeInput(timeInput);
        productMinutes = parsed.minutes !== null ? String(parsed.minutes) : undefined;
        displayTime = parsed.display || undefined;
        minMinutes = parsed.min !== null ? String(parsed.min) : undefined;
        maxMinutes = parsed.max !== null ? String(parsed.max) : undefined;
      } catch (e) {
        return badRequest(e instanceof Error ? e.message : "잘못된 시간 입력");
      }
    }

    const newId = await appendTravelTime({
      area: area.toUpperCase(),
      hotel_id: from_id,
      golf_id: to_id,
      product_reference_minutes: productMinutes || "",
      display_time: displayTime || "",
      min_minutes: minMinutes || "",
      max_minutes: maxMinutes || "",
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
    const { id } = body;

    if (!id) {
      return badRequest("id 필수");
    }

    // A03: 시간 입력 매핑
    const timeInput = body.verified_drive_min || body.product_reference_minutes;
    const updateData: Record<string, string> = { ...body };

    if (timeInput !== undefined) {
      try {
        const parsed = parseTravelTimeInput(timeInput);
        updateData.product_reference_minutes = parsed.minutes !== null ? String(parsed.minutes) : "";
        updateData.display_time = parsed.display;
        updateData.min_minutes = parsed.min !== null ? String(parsed.min) : "";
        updateData.max_minutes = parsed.max !== null ? String(parsed.max) : "";
      } catch (e) {
        return badRequest(e instanceof Error ? e.message : "잘못된 시간 입력");
      }
    }
    delete updateData.verified_drive_min;

    const success = await updateTravelTime(updateData);
    if (!success) {
      return serverError(new Error("수정 실패"));
    }

    return ok({ success: true });
  } catch (error) {
    // A04: ConflictError는 staleVersion으로 변환
    if (error instanceof ConflictError) {
      return staleVersion(error.message);
    }
    return serverError(error);
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return badRequest("id 필수");
    }
    const deleted = await deleteTravelTime(id);
    if (!deleted) {
      return serverError(new Error("삭제 실패 또는 이미 삭제됨"));
    }
    return ok({ deleted: true, id });
  } catch (err) {
    return serverError(err);
  }
}
