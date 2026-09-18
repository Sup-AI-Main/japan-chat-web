import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabaseServer();

  // Test 1: relation select with area, category, related_entity
  const t1 = performance.now();
  const { data, error } = await db
    .from('faq')
    .select(`
      id, area_id, category_id, related_entity_id, scope, question, answer, source_url, status, active, sort,
      area:areas(code),
      category:categories(code),
      related_entity:entities!related_entity_id(slug, display_name)
    `)
    .eq('active', true)
    .limit(5);
  const elapsed = Math.round(performance.now() - t1);

  if (error) {
    console.error("[FAQ_TEST_ERROR]", error);
    return NextResponse.json(
      { error: "Query failed" },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    { elapsed, count: data?.length, sample: data?.slice(0, 2) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
