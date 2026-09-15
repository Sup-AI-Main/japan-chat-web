import { NextResponse } from 'next/server';
import {
  resolveArea,
  getAreaCategories,
  getFaq,
  getCommonCategories,
  getTravelTimes,
  getAreaEntitySummaryMap,
} from '@/lib/supabase-cms';
import { resolveAreaBySlug } from '@/lib/area';

export const dynamic = 'force-dynamic';

function ts() { return performance.now(); }
function ms(v: number) { return Math.round(v * 100) / 100; }

export async function GET() {
  const t0 = ts();
  const areaCode = 'DOS';

  // Warm up all caches
  await resolveAreaBySlug('dos');
  await resolveArea(areaCode);
  await getAreaCategories();
  await getFaq(areaCode);
  await getTravelTimes(areaCode);
  await getAreaEntitySummaryMap(areaCode);
  await getCommonCategories();

  // ---- PRECISE PER-QUERY TIMESTAMP MEASUREMENT ----
  // Wrap each query to capture start/end relative to Promise.all start

  const baseTs = ts();

  const timestamps: Record<string, { start: number; end: number; duration: number }> = {};

  function tracked<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = ms(ts() - baseTs);
    timestamps[label] = { start, end: 0, duration: 0 };
    return fn().then((result) => {
      const end = ms(ts() - baseTs);
      timestamps[label].end = end;
      timestamps[label].duration = ms(end - start);
      return result;
    });
  }

  // Simulate page Promise.all with tracked wrappers
  const pageStart = ts();
  await resolveArea(areaCode); // cached, ~0ms

  const parallelBase = ts();
  const [, , , , ,] = await Promise.all([
    tracked('getAreaCategories', () => getAreaCategories()),
    tracked('getFaq', () => getFaq(areaCode).catch(() => [])),
    tracked('getTravelTimes', () => getTravelTimes(areaCode).catch(() => [])),
    tracked('getAreaEntitySummaryMap', () => getAreaEntitySummaryMap(areaCode).catch(() => ({ hotels: [], golfCourses: [] }))),
    tracked('getCommonCategories', () => getCommonCategories()),
  ]);
  const parallelEnd = ts();
  const parallelWallClock = ms(parallelEnd - parallelBase);

  // ---- SECOND RUN to check consistency ----
  const timestamps2: Record<string, { start: number; end: number; duration: number }> = {};
  function tracked2<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = ms(ts() - parallelEnd);
    timestamps2[label] = { start, end: 0, duration: 0 };
    return fn().then((result) => {
      const end = ms(ts() - parallelEnd);
      timestamps2[label].end = end;
      timestamps2[label].duration = ms(end - start);
      return result;
    });
  }

  const parallelBase2 = ts();
  await Promise.all([
    tracked2('getAreaCategories', () => getAreaCategories()),
    tracked2('getFaq', () => getFaq(areaCode).catch(() => [])),
    tracked2('getTravelTimes', () => getTravelTimes(areaCode).catch(() => [])),
    tracked2('getAreaEntitySummaryMap', () => getAreaEntitySummaryMap(areaCode).catch(() => ({ hotels: [], golfCourses: [] }))),
    tracked2('getCommonCategories', () => getCommonCategories()),
  ]);
  const parallelWallClock2 = ms(ts() - parallelBase2);

  // ---- THIRD RUN ----
  const timestamps3: Record<string, { start: number; end: number; duration: number }> = {};
  const parallelBase3 = ts();
  await Promise.all([
    (() => { const s = ms(ts() - parallelBase3); timestamps3['getAreaCategories'] = { start: s, end: 0, duration: 0 }; return getAreaCategories().then(r => { timestamps3['getAreaCategories'].end = ms(ts() - parallelBase3); timestamps3['getAreaCategories'].duration = ms(timestamps3['getAreaCategories'].end - s); return r; }); })(),
    (() => { const s = ms(ts() - parallelBase3); timestamps3['getFaq'] = { start: s, end: 0, duration: 0 }; return getFaq(areaCode).catch(() => []).then(r => { timestamps3['getFaq'].end = ms(ts() - parallelBase3); timestamps3['getFaq'].duration = ms(timestamps3['getFaq'].end - s); return r; }); })(),
    (() => { const s = ms(ts() - parallelBase3); timestamps3['getTravelTimes'] = { start: s, end: 0, duration: 0 }; return getTravelTimes(areaCode).catch(() => []).then(r => { timestamps3['getTravelTimes'].end = ms(ts() - parallelBase3); timestamps3['getTravelTimes'].duration = ms(timestamps3['getTravelTimes'].end - s); return r; }); })(),
    (() => { const s = ms(ts() - parallelBase3); timestamps3['getAreaEntitySummaryMap'] = { start: s, end: 0, duration: 0 }; return getAreaEntitySummaryMap(areaCode).catch(() => ({ hotels: [], golfCourses: [] })).then(r => { timestamps3['getAreaEntitySummaryMap'].end = ms(ts() - parallelBase3); timestamps3['getAreaEntitySummaryMap'].duration = ms(timestamps3['getAreaEntitySummaryMap'].end - s); return r; }); })(),
    (() => { const s = ms(ts() - parallelBase3); timestamps3['getCommonCategories'] = { start: s, end: 0, duration: 0 }; return getCommonCategories().then(r => { timestamps3['getCommonCategories'].end = ms(ts() - parallelBase3); timestamps3['getCommonCategories'].duration = ms(timestamps3['getCommonCategories'].end - s); return r; }); })(),
  ]);
  const parallelWallClock3 = ms(ts() - parallelBase3);

  const totalMs = ms(ts() - t0);

  return NextResponse.json({
    run1: { timestamps, wall_clock_ms: parallelWallClock },
    run2: { timestamps: timestamps2, wall_clock_ms: parallelWallClock2 },
    run3: { timestamps: timestamps3, wall_clock_ms: parallelWallClock3 },
    total_endpoint_ms: totalMs,
  });
}
