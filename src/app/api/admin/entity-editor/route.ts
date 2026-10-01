import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ok, badRequest, serverError, safeJson, staleVersion } from "@/lib/crud/response";
import { validateEntityDetailsDocument } from "@/lib/entity-details/validate";
import { normalizeEntityDetails } from "@/lib/entity-details/normalize";
import { revalidateEntityDetail } from "@/lib/revalidate-entity";
import { ENTITY_TYPE_WHITELIST } from "@/lib/entity-details/constants";

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
      .select("id, slug, display_name, entity_type, updated_at, details_json, areas(code)")
      .eq("id", entityId)
      .single();

    if (error) {
      console.error("[ENTITY_EDITOR_GET]", error.message);
      return badRequest("Entity not found");
    }

    if (!data) {
      return badRequest("Entity not found");
    }

    // Extract area code from relation
    const areaRelation = data.areas as { code: string }[] | { code: string } | null;
    const areaCode = Array.isArray(areaRelation)
      ? areaRelation[0]?.code
      : areaRelation?.code;

    let detailsJson = data.details_json;
    if (!detailsJson) {
      // Legacy content_sections must remain editable when an entity has not
      // yet been migrated to the JSON document format. Convert them into the
      // editor's draft shape without mutating the database during GET.
      const { data: legacySections, error: legacyError } = await supabase
        .from("content_sections")
        .select("id, title, content, emoji, sort, is_visible")
        .eq("parent_entity_id", entityId)
        .order("sort");

      if (legacyError) throw legacyError;
      if (legacySections && legacySections.length > 0) {
        detailsJson = {
          version: 1,
          sections: legacySections.map((section) => ({
            id: `legacy-section-${section.id}`,
            key: `legacy_${section.id}`,
            title_ko: section.title || "추가 안내",
            title_jp: null,
            emoji: section.emoji || null,
            sort: section.sort ?? 0,
            is_visible: section.is_visible !== false,
            items: [
              {
                id: `legacy-item-${section.id}`,
                key: `legacy_${section.id}_content`,
                label_ko: "",
                label_jp: null,
                type: "textarea",
                value: section.content || null,
                value_jp: null,
                sort: 0,
                is_visible: section.is_visible !== false,
              },
            ],
          })),
        };
      }
    }

    // The legacy include/exclude rows are also part of the entity's editable
    // details. Project them into the shared editor so every entity type gets
    // the same section/item CRUD UI. Existing JSON sections remain untouched.
    const { data: includeExcludeRows, error: includeExcludeError } = await supabase
      .from("includes_excludes")
      .select("id, type, text_kr, text_jp, sort, is_visible")
      .eq("parent_entity_id", entityId)
      .order("sort");

    if (includeExcludeError) throw includeExcludeError;
    if (includeExcludeRows && includeExcludeRows.length > 0) {
      const base = detailsJson && typeof detailsJson === "object"
        ? structuredClone(detailsJson as { version?: number; sections?: Array<Record<string, unknown>> })
        : { version: 1, sections: [] };
      const sections = Array.isArray(base.sections) ? base.sections : [];
      const includedRows = includeExcludeRows.filter((row) => row.type === "INCLUDED");
      const excludedRows = includeExcludeRows.filter((row) => row.type === "EXCLUDED");

      const addLegacySection = (
        key: string,
        title: string,
        rows: typeof includeExcludeRows,
        sort: number,
      ) => {
        if (sections.some((section) => section.key === key)) return;
        sections.push({
          id: `legacy-${key}`,
          key,
          title_ko: title,
          title_jp: null,
          sort,
          is_visible: true,
          items: rows.map((row, index) => ({
            id: `legacy-${key}-${row.id}`,
            key: `legacy_${key}_${row.id}`,
            label_ko: "",
            label_jp: row.text_jp || null,
            type: "text",
            value: row.text_kr || "",
            sort: row.sort ?? index,
            is_visible: row.is_visible !== false,
            legacy_id: row.id,
            source: "includes_excludes",
          })),
        });
      };

      addLegacySection("includes", "포함사항", includedRows, sections.length);
      addLegacySection("excludes", "불포함사항", excludedRows, sections.length);
      detailsJson = { version: 1, sections };
    }

    return ok({
      id: data.id,
      slug: data.slug,
      display_name: data.display_name,
      entity_type: data.entity_type,
      updated_at: data.updated_at,
      details_json: detailsJson,
      area: areaCode ?? null,
    });
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

    // Runtime validation before DB write
    let validated;
    try {
      validated = validateEntityDetailsDocument(details_json);
    } catch (err) {
      return badRequest(
        err instanceof Error ? err.message : "Invalid details_json"
      );
    }

    // Normalize for canonical storage
    const normalized = normalizeEntityDetails(validated);

    // Entity type whitelist check
    const supabase = getSupabaseAdmin();
    const { data: entity, error: lookupError } = await supabase
      .from("entities")
      .select("entity_type, areas(code), slug")
      .eq("id", entity_id)
      .single();

    if (lookupError || !entity) {
      return badRequest("Entity not found");
    }

    if (!ENTITY_TYPE_WHITELIST.has(entity.entity_type?.toUpperCase())) {
      return badRequest(`Unsupported entity type: ${entity.entity_type}`);
    }

    // RPC optimistic save
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "admin_save_entity_editor_v1",
      {
        p_entity_id: entity_id,
        p_expected_updated_at: expected_updated_at,
        p_details: normalized,
      }
    );

    if (rpcError) {
      console.error("[ENTITY_EDITOR_PUT_RPC]", rpcError.message);
      if (rpcError.message?.includes("ENTITY_NOT_FOUND")) {
        return badRequest("Entity not found");
      }
      return serverError(rpcError);
    }

    // Check conflict from RPC result
    const result = rpcResult as {
      conflict: boolean;
      id?: string;
      slug?: string;
      updated_at?: string;
      details_json?: unknown;
      current_updated_at?: string;
    };

    if (result.conflict) {
      return staleVersion(
        "다른 사용자가 이 데이터를 수정했습니다. 새로고침 후 다시 시도하세요."
      );
    }

    // Targeted revalidation (server-side)
    const areaRelation = entity.areas as { code: string }[] | { code: string } | null;
    const areaCode = Array.isArray(areaRelation)
      ? areaRelation[0]?.code
      : areaRelation?.code;
    const slug = result.slug || entity.slug;

    let revalidated = false;
    if (areaCode && slug) {
      try {
        revalidateEntityDetail({
          entityType: entity.entity_type,
          area: areaCode,
          slug,
        });
        revalidated = true;
      } catch (err) {
        console.error("[ENTITY_EDITOR_REVALIDATE]", err);
        // revalidated stays false — client will see truthful status
      }
    }

    // Canonical response (from DB re-read inside RPC)
    return ok({
      conflict: false,
      id: result.id,
      slug: result.slug,
      updated_at: result.updated_at,
      details_json: result.details_json,
      revalidated,
    });
  } catch (err) {
    return serverError(err);
  }
}
