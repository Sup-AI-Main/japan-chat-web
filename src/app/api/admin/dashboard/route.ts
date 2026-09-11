import { isAuthenticated } from "@/lib/auth";
import { listAreas, listCategories, ok, unauthorized, serverError } from "@/lib/crud";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) return unauthorized();

  try {
    const db = getSupabaseServer();

    const [areas, categories, entitiesResult, faqResult] = await Promise.all([
      listAreas(),
      listCategories(),
      db.from("entities").select("area_id, category_id"),
      db.from("faq").select("area_id, category_id"),
    ]);

    const entityCountsByArea: Record<string, number> = {};
    const entityCountsByCategory: Record<string, number> = {};
    // Cross-tabulation: area_id → category_id → count
    const entityCountsByAreaCategory: Record<string, Record<string, number>> = {};
    for (const row of entitiesResult.data ?? []) {
      if (row.area_id) {
        entityCountsByArea[row.area_id] = (entityCountsByArea[row.area_id] ?? 0) + 1;
      }
      if (row.category_id) {
        entityCountsByCategory[row.category_id] = (entityCountsByCategory[row.category_id] ?? 0) + 1;
      }
      if (row.area_id && row.category_id) {
        if (!entityCountsByAreaCategory[row.area_id]) {
          entityCountsByAreaCategory[row.area_id] = {};
        }
        entityCountsByAreaCategory[row.area_id][row.category_id] =
          (entityCountsByAreaCategory[row.area_id][row.category_id] ?? 0) + 1;
      }
    }

    const faqCountsByCategory: Record<string, number> = {};
    const faqCountsByArea: Record<string, number> = {};
    for (const row of faqResult.data ?? []) {
      if (row.category_id) {
        faqCountsByCategory[row.category_id] = (faqCountsByCategory[row.category_id] ?? 0) + 1;
      }
      if (row.area_id) {
        faqCountsByArea[row.area_id] = (faqCountsByArea[row.area_id] ?? 0) + 1;
      }
    }

    return ok({
      areas,
      categories,
      entityCountsByArea,
      entityCountsByCategory,
      entityCountsByAreaCategory,
      faqCountsByCategory,
      faqCountsByArea,
    });
  } catch (err) {
    return serverError(err);
  }
}
