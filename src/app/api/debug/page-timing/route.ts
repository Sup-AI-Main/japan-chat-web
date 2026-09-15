import { NextResponse } from 'next/server';
import {
  resolveArea,
  getAreaCategories,
  getFaq,
  getCommonCategories,
  getTravelTimes,
  getAreaEntitySummaries,
} from '@/lib/supabase-cms';
import { resolveAreaBySlug } from '@/lib/area';
import { getSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function timed<T>(label: string, fn: () => Promise<T>): Promise<{ label: string; ms: number; ok: boolean; rows: number }> {
  const start = performance.now();
  let ok = true;
  let rows = 0;
  try {
    const result = await fn();
    if (Array.isArray(result)) rows = result.length;
    else if (result) rows = 1;
  } catch {
    ok = false;
  }
  return { label, ms: Math.round((performance.now() - start) * 100) / 100, ok, rows };
}

export async function GET() {
  const areaCode = 'DOS';
  const timings: Record<string, unknown> = {};

  // --- Sequential individual measurements ---

  // 1. Layout: resolveAreaLayout → fetchAreas (area.ts cache)
  timings.areaLayout_resolve = await timed('areaLayout_resolve', () => resolveAreaBySlug('dos'));

  // 2. Page: resolveArea → resolveAreaBySlug (same cache, should be 0ms on warm)
  timings.page_resolveArea = await timed('page_resolveArea', () => resolveArea(areaCode));

  // 3. getAreaCategories
  timings.getAreaCategories = await timed('getAreaCategories', () => getAreaCategories());

  // 4. getFaq
  timings.getFaq = await timed('getFaq', () => getFaq(areaCode));

  // 5. getTravelTimes
  timings.getTravelTimes = await timed('getTravelTimes', () => getTravelTimes(areaCode));

  // 6. getAreaEntitySummaries HOTEL
  timings.entitySummaries_HOTEL = await timed('entitySummaries_HOTEL', () => getAreaEntitySummaries(areaCode, 'HOTEL'));

  // 7. getAreaEntitySummaries GOLF
  timings.entitySummaries_GOLF = await timed('entitySummaries_GOLF', () => getAreaEntitySummaries(areaCode, 'GOLF'));

  // 8. getCommonCategories
  timings.getCommonCategories = await timed('getCommonCategories', () => getCommonCategories());

  // --- Combined: sequential sum vs parallel wall-clock ---

  // Sequential total (sum of individual timings above)
  const seqTotal = Object.values(timings)
    .filter((t): t is { ms: number } => typeof t === 'object' && t !== null && 'ms' in t)
    .reduce((sum, t) => sum + t.ms, 0);

  // Parallel measurement: same queries as page's Promise.all (after resolveArea)
  const parallelStart = performance.now();
  const [categories, faq, travelTimes, hotelNames, golfNames, commonCats] = await Promise.all([
    getAreaCategories(),
    getFaq(areaCode).catch(() => []),
    getTravelTimes(areaCode).catch(() => []),
    getAreaEntitySummaries(areaCode, 'HOTEL').catch(() => []),
    getAreaEntitySummaries(areaCode, 'GOLF').catch(() => []),
    getCommonCategories(),
  ]);
  const parallelMs = Math.round((performance.now() - parallelStart) * 100) / 100;

  // --- Combined entity summaries (1 query for HOTEL+GOLF) ---
  const db = getSupabaseServer();
  const combinedStart = performance.now();
  const { data: combinedEntities } = await db
    .from('entities')
    .select('slug, display_name, entity_type')
    .in('entity_type', ['HOTEL', 'GOLF'])
    .eq('area_id', (await resolveAreaBySlug('dos'))?.id ?? '')
    .eq('active', true)
    .order('sort');
  const combinedMs = Math.round((performance.now() - combinedStart) * 100) / 100;
  const combinedRows = combinedEntities?.length ?? 0;

  // Full page simulation: resolveArea + Promise.all
  const pageStart = performance.now();
  await resolveArea(areaCode); // layout + page (cached)
  await Promise.all([
    getAreaCategories(),
    getFaq(areaCode).catch(() => []),
    getTravelTimes(areaCode).catch(() => []),
    getAreaEntitySummaries(areaCode, 'HOTEL').catch(() => []),
    getAreaEntitySummaries(areaCode, 'GOLF').catch(() => []),
    getCommonCategories(),
  ]);
  const pageTotalMs = Math.round((performance.now() - pageStart) * 100) / 100;

  return NextResponse.json({
    timings,
    sequential_sum_ms: Math.round(seqTotal * 100) / 100,
    parallel_ms: parallelMs,
    page_total_ms: pageTotalMs,
    combined_entity_query_ms: combinedMs,
    combined_entity_rows: combinedRows,
    row_counts: {
      categories: categories.length,
      faq: faq.length,
      travelTimes: travelTimes.length,
      hotelNames: hotelNames.length,
      golfNames: golfNames.length,
      commonCats: commonCats.length,
    },
  });
}
