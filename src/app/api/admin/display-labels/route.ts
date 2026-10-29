import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { revalidateEntityPaths } from "@/lib/revalidate-labels";

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    entity_type?: string;
    section_key?: string;
    field_key?: string;
    label_ko?: string;
    entity_id?: string;
  } | null;
  const entityType = body?.entity_type?.toUpperCase();
  const label = body?.label_ko?.trim() ?? "";
  if (!entityType || !body?.entity_id || (!body?.section_key && !body?.field_key)) {
    return Response.json({ error: "entity_type, label_ko와 section_key 또는 field_key가 필요합니다." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: entity, error: readError } = await db.from("entities").select("entity_type, details_json").eq("id", body.entity_id).single();
  if (readError || !entity || entity.entity_type !== entityType) return Response.json({ error: "엔티티를 찾을 수 없습니다." }, { status: 404 });
  const details = entity.details_json && typeof entity.details_json === "object" ? structuredClone(entity.details_json as { sections?: Array<Record<string, unknown>> }) : { sections: [] };
  const sections = Array.isArray(details.sections) ? details.sections : [];
  let found = false;
  if (body.section_key) {
    const section = sections.find((item) => item.key === body.section_key);
    if (section) {
      found = true;
      if (label) section.title_ko = label;
      else delete section.title_ko;
    }
  } else {
    for (const section of sections) {
      const items = Array.isArray(section.items) ? section.items as Array<Record<string, unknown>> : [];
      const item = items.find((entry) => entry.key === body.field_key);
      if (item) {
        found = true;
        if (label) item.label_ko = label;
        else delete item.label_ko;
      }
    }
  }
  if (!found) {
    if (!label) return Response.json({ error: "공통 레이블은 비울 수 없습니다.", code: "BAD_REQUEST" }, { status: 400 });
    const update = body.section_key
      ? db.from("section_definitions").update({ label_ko: label }).eq("entity_type", entityType).eq("section_key", body.section_key).select("id").maybeSingle()
      : db.from("field_definitions").update({ label_ko: label }).eq("scope_entity_type", entityType).eq("field_key", body.field_key!).select("id").maybeSingle();
    const { data: definition, error: definitionError } = await update;
    if (definitionError) return Response.json({ error: definitionError.message, code: "SERVER_ERROR" }, { status: 500 });
    if (!definition) return Response.json({ error: "수정할 레이블을 찾을 수 없습니다.", code: "NOT_FOUND" }, { status: 404 });
    await revalidateEntityPaths(entityType);
    return Response.json({ success: true, data: definition });
  }
  const result = await db.from("entities").update({ details_json: details }).eq("id", body.entity_id).select("id, details_json").single();

  if (result.error) {
    return Response.json({ error: result.error.message }, { status: result.error.code === "PGRST116" ? 404 : 500 });
  }
  await revalidateEntityPaths(entityType);
  return Response.json({ success: true, data: result.data });
}
