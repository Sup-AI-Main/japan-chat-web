import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getActiveAreas, resolveAreaBySlug, resolveAreaByCode } from "@/lib/area";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Direct Supabase raw query
    const db = getSupabaseServer();
    const { data: rawData, error: rawError } = await db
      .from('areas')
      .select('id, code, name_kr, active, sort')
      .order('sort');

    // 2. Via exported API
    const activeAreas = await getActiveAreas();
    const resolvedBySlug = await resolveAreaBySlug("dos");
    const resolvedByCode = await resolveAreaByCode("DOS");

    return NextResponse.json({
      env_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      env_key: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      raw_query: {
        error: rawError?.message ?? null,
        count: rawData?.length ?? 0,
        rows: rawData ?? [],
      },
      active_areas_count: activeAreas.length,
      active_areas: activeAreas.map((a) => ({
        id: a.id,
        code: a.code,
        active: a.active,
      })),
      resolve_by_slug_dos: resolvedBySlug
        ? { id: resolvedBySlug.id, code: resolvedBySlug.code, active: resolvedBySlug.active }
        : null,
      resolve_by_code_DOS: resolvedByCode
        ? { id: resolvedByCode.id, code: resolvedByCode.code, active: resolvedByCode.active }
        : null,
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.split("\n").slice(0, 5) : undefined,
    });
  }
}
