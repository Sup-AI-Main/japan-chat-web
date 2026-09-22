import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ok, badRequest, serverError, safeJson } from "@/lib/crud/response";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const entityId = req.nextUrl.searchParams.get("entity_id");
    if (!entityId) return badRequest("Missing entity_id");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("entities")
      .select("id, slug, display_name, entity_type, updated_at, details_json")
      .eq("id", entityId)
      .single();

    if (error) {
      console.error("[ENTITY_EDITOR_GET]", error.message);
      return badRequest("Entity not found");
    }

    if (!data) {
      return badRequest("Entity not found");
    }

    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}

interface PutBody {
  entity_id: string;
  expected_updated_at: string;
  details_json: unknown;
}

export async function PUT(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const body = await safeJson<PutBody>(req);
    if (!body) return badRequest("Empty request body");

    const { entity_id, expected_updated_at, details_json } = body;
    if (!entity_id) return badRequest("Missing entity_id");
    if (!expected_updated_at) return badRequest("Missing expected_updated_at");
    if (!details_json) return badRequest("Missing details_json");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("admin_save_entity_editor_v1", {
      p_entity_id: entity_id,
      p_expected_updated_at: expected_updated_at,
      p_details: details_json,
    });

    if (error) {
      console.error("[ENTITY_EDITOR_PUT_RPC]", error.message);
      return serverError(error);
    }

    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}
