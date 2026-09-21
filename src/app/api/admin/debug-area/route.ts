/**
 * TEMPORARY debug route — DELETE after investigation.
 * Diagnoses /admin/dos 404 root cause.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { resolveAreaFromAdmin } from "@/lib/supabase-cms";
import { resolveAreaBySlug } from "@/lib/area";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const area = req.nextUrl.searchParams.get("area") || "dos";
  const code = area.trim().toUpperCase();

  // A. resolveAreaFromAdmin
  const adminResult = await resolveAreaFromAdmin(area);

  // B. resolveAreaBySlug
  const slugResult = await resolveAreaBySlug(area);

  // C. Direct DB query (anon key)
  const { data: directDb, error: directDbError } = await getSupabaseServer()
    .from("areas")
    .select("id, code, name_kr, active, sort")
    .eq("code", code)
    .maybeSingle();

  // D. All areas from direct DB
  const { data: allAreas, error: allAreasError } = await getSupabaseServer()
    .from("areas")
    .select("id, code, name_kr, active, sort")
    .order("sort");

  return NextResponse.json({
    input: { rawParam: area, normalizedCode: code },
    isAuthenticated: authed,
    A_resolveAreaFromAdmin: adminResult
      ? { id: adminResult.id, code: adminResult.code, active: adminResult.active }
      : null,
    B_resolveAreaBySlug: slugResult
      ? { id: slugResult.id, code: slugResult.code, active: slugResult.active }
      : null,
    C_directDbQuery: directDb || { error: directDbError?.message },
    D_allAreas: (allAreas || []).map((a) => ({
      code: a.code,
      active: a.active,
    })),
    D_allAreasError: allAreasError?.message || null,
  });
}
