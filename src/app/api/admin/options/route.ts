import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const body = await req.json();
  const { category_kr, category_jp, created } = body;

  if (!category_kr) {
    return NextResponse.json({ error: 'category_kr required' }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('display_options')
    .upsert(
      {
        category_kr,
        category_jp: category_jp || null,
        created: created || new Date().toISOString(),
      },
      { onConflict: 'category_kr' }
    )
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category_kr');

  if (!category) {
    return NextResponse.json({ error: 'category_kr required' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from('display_options')
    .delete()
    .eq('category_kr', category);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
