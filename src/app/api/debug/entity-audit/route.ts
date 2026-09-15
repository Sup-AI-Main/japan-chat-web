import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getSupabaseServer();

  // All entities with area and category info
  const { data: entities } = await db
    .from('entities')
    .select('id, slug, display_name, entity_type, active, sort, area_id, category_id, areas(code), categories(code)')
    .order('sort');

  // All areas
  const { data: areas } = await db.from('areas').select('id, code, label').eq('active', true);

  // All categories
  const { data: categories } = await db.from('categories').select('id, code, label, group_type');

  const entityRows = (entities || []).map((e) => {
    const areaRel = e.areas as { code: string } | null;
    const catRel = e.categories as { code: string } | null;
    return {
      slug: e.slug,
      display_name: e.display_name,
      entity_type: e.entity_type,
      area_code: areaRel?.code ?? 'NONE',
      category_code: catRel?.code ?? 'NONE',
      active: e.active,
      sort: e.sort,
    };
  });

  // Summary by area + entity_type
  const summary: Record<string, Record<string, { names: string[]; count: number }>> = {};
  for (const e of entityRows) {
    const areaKey = e.area_code;
    const typeKey = e.entity_type;
    if (!summary[areaKey]) summary[areaKey] = {};
    if (!summary[areaKey][typeKey]) summary[areaKey][typeKey] = { names: [], count: 0 };
    summary[areaKey][typeKey].count++;
    summary[areaKey][typeKey].names.push(`${e.display_name} [${e.slug}] (active=${e.active})`);
  }

  // DOS-specific: getHotels query simulation
  const { data: dosHotels } = await db
    .from('hotels')
    .select('entity_id, entities!inner(id, slug, display_name, entity_type, area_id, active, areas!inner(code))')
    .eq('entities.areas.code', 'DOS');

  const dosHotelEntities = (dosHotels || []).map((h) => {
    const ent = h.entities as unknown as { slug: string; display_name: string; entity_type: string; active: boolean };
    return { slug: ent.slug, name: ent.display_name, type: ent.entity_type, active: ent.active };
  });

  // DOS-specific: getGolfCourses query simulation
  const { data: dosGolf } = await db
    .from('golf_courses')
    .select('entity_id, entities!inner(id, slug, display_name, entity_type, area_id, active, areas!inner(code))')
    .eq('entities.areas.code', 'DOS');

  const dosGolfEntities = (dosGolf || []).map((g) => {
    const ent = g.entities as unknown as { slug: string; display_name: string; entity_type: string; active: boolean };
    return { slug: ent.slug, name: ent.display_name, type: ent.entity_type, active: ent.active };
  });

  return NextResponse.json({
    all_entities: entityRows,
    summary_by_area_type: summary,
    dos_hotels_via_getHotels: dosHotelEntities,
    dos_golf_via_getGolfCourses: dosGolfEntities,
    areas: areas || [],
    categories: categories || [],
  });
}
