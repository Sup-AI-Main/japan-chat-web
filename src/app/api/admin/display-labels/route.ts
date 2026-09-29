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
  const label = body?.label_ko?.trim();
  if (!entityType || !body?.entity_id || !label || (!body?.section_key && !body?.field_key)) {
    return Response.json({ error: "entity_type, label_ko와 section_key 또는 field_key가 필요합니다." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: entity, error: readError } = await db.from("entities").select("entity_type, details_json").eq("id", body.entity_id).single();
  if (readError || !entity || entity.entity_type !== entityType) return Response.json({ error: "엔티티를 찾을 수 없습니다." }, { status: 404 });
  const details = entity.details_json && typeof entity.details_json === "object" ? structuredClone(entity.details_json as { sections?: Array<Record<string, unknown>> }) : { sections: [] };
  const sections = Array.isArray(details.sections) ? details.sections : [];
  if (body.section_key) {
    const section = sections.find((item) => item.key === body.section_key);
    if (section) section.title_ko = label;
  } else {
    for (const section of sections) {
      const items = Array.isArray(section.items) ? section.items as Array<Record<string, unknown>> : [];
      const item = items.find((entry) => entry.key === body.field_key);
      if (item) item.label_ko = label;
    }
  }
  const result = await db.from("entities").update({ details_json: details }).eq("id", body.entity_id).select("id, details_json").single();

  if (result.error) {
    return Response.json({ error: result.error.message }, { status: result.error.code === "PGRST116" ? 404 : 500 });
  }
  await revalidateEntityPaths(entityType);
  return Response.json({ data: result.data });
}
