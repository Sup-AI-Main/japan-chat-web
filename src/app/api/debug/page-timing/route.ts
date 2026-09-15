import { NextResponse } from 'next/server';
import {
  resolveArea,
  getAreaCategories,
  getFaq,
  getCommonCategories,
  getTravelTimes,
  getAreaEntitySummaries,
  getAreaEntitySummaryMap,
} from '@/lib/supabase-cms';
import { resolveAreaBySlug } from '@/lib/area';

export const dynamic = 'force-dynamic';

async function timed<T>(label: string, fn: () => Promise<T>): Promise<{ label: string; ms: number; ok: boolean; rows: number }> {
  const start = performance.now();
  let ok = true;
  let rows = 0;
  try {
    const result = await fn();
    if (Array.isArray(result)) rows = result.length;
    else if (result && typeof result === 'object' && 'hotels' in result) rows = (result as { hotels: unknown[] }).hotels.length + (result as { golfCourses: unknown[] }).golfCourses.length;
    else if (result) rows = 1;
  } catch {
    ok = false;
  }
  return { label, ms: Math.round((performance.now() - start) * 100) / 100, ok, rows };
}

export async function GET() {
  const areaCode = 'DOS';
  const timings: Record<string, unknown> = {};

  // --- Warm up caches ---
  await resolveAreaBySlug('dos');
  await resolveArea(areaCode);
  await getAreaCategories();
  await getFaq(areaCode);
  await getTravelTimes(areaCode);
  await getAreaEntitySummaryMap(areaCode);

  // --- Individual sequential measurements (all warm/cached where applicable) ---

  timings.areaLayout_resolve = await timed('areaLayout_resolve', () => resolveAreaBySlug('dos'));
  timings.page_resolveArea = await timed('page_resolveArea', () => resolveArea(areaCode));
  timings.getAreaCategories = await timed('getAreaCategories', () => getAreaCategories());
  timings.getFaq = await timed('getFaq', () => getFaq(areaCode));
  timings.getTravelTimes = await timed('getTravelTimes', () => getTravelTimes(areaCode));
  timings.getAreaEntitySummaryMap = await timed('getAreaEntitySummaryMap', () => getAreaEntitySummaryMap(areaCode));
  timings.getCommonCategories = await timed('getCommonCategories', () => getCommonCategories());

  // OLD approach: 2 separate entity queries (for comparison)
  timings.old_entity_HOTEL = await timed('old_entity_HOTEL', () => getAreaEntitySummaries(areaCode, 'HOTEL'));
  timings.old_entity_GOLF = await timed('old_entity_GOLF', () => getAreaEntitySummaries(areaCode, 'GOLF'));

  // Sequential sum of NEW approach
  const seqTotal = Object.values(timings)
    .filter((t): t is { ms: number } => typeof t === 'object' && t !== null && 'ms' in t && !String(t.label).startsWith('old_'))
    .reduce((sum, t) => sum + t.ms, 0);

  // Parallel measurement: NEW approach (5 queries)
  const parallelStart = performance.now();
  const [categories, faq, travelTimes, entityMap, commonCats] = await Promise.all([
    getAreaCategories(),
    getFaq(areaCode).catch(() => []),
    getTravelTimes(areaCode).catch(() => []),
    getAreaEntitySummaryMap(areaCode).catch(() => ({ hotels: [], golfCourses: [] })),
    getCommonCategories(),
  ]);
  const parallelMs = Math.round((performance.now() - parallelStart) * 100) / 100;

  // Full page simulation (NEW)
  const pageStart = performance.now();
  await resolveArea(areaCode);
  await Promise.all([
    getAreaCategories(),
    getFaq(areaCode).catch(() => []),
    getTravelTimes(areaCode).catch(() => []),
    getAreaEntitySummaryMap(areaCode).catch(() => ({ hotels: [], golfCourses: [] })),
    getCommonCategories(),
  ]);
  const pageTotalMs = Math.round((performance.now() - pageStart) * 100) / 100;

  return NextResponse.json({
    timings,
    sequential_sum_ms_new: Math.round(seqTotal * 100) / 100,
    parallel_ms_new: parallelMs,
    page_total_ms_new: pageTotalMs,
    row_counts: {
      categories: categories.length,
      faq: faq.length,
      travelTimes: travelTimes.length,
      hotels: entityMap.hotels.length,
      golfCourses: entityMap.golfCourses.length,
      commonCats: commonCats.length,
    },
  });
}
