import { resolveAreaLayout, getAdminOptions } from "@/lib/supabase-cms";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const options = await getAdminOptions();
    // A14: option_type으로 필터링 (group이 아닌), ALL 제외
    const areas = options.filter(o => o.option_type === 'AREA' && o.active !== 'FALSE' && o.code !== 'ALL');
    return areas.map((area) => ({ area: area.code.toLowerCase() }));
  } catch {
    return [{ area: 'dos' }, { area: 'beppu' }];
  }
}

export default async function AreaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  const { bgClass } = await resolveAreaLayout(area);

  return (
    <div className={`page-bg ${bgClass} min-h-screen`}>
      {children}
    </div>
  );
}
