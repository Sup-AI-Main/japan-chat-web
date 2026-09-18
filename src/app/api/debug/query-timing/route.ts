import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
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
  // A15: production에서는 비활성화, 비-production에서는 인증 필요
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  const parallelBase = ts();
  await Promise.all([
    tracked('getAreaCategories', () => getAreaCategories()),
    tracked('getFaq', () => getFaq(areaCode).catch(() => [])),
    tracked('getTravelTimes', () => getTravelTimes(areaCode).catch(() => [])),
    tracked('getAreaEntitySummaryMap', () => getAreaEntitySummaryMap(areaCode).catch(() => ({ hotels: [], golfCourses: [] }))),
    tracked('getCommonCategories', () => getCommonCategories()),
  ]);
  const parallelWallClock = ms(ts() - parallelBase);

  const totalMs = ms(ts() - t0);

  return NextResponse.json({
    run1: { timestamps, wall_clock_ms: parallelWallClock },
    total_endpoint_ms: totalMs,
  });
}
