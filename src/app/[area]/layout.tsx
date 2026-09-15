import { resolveAreaLayout, getAdminOptions } from "@/lib/supabase-cms";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const options = await getAdminOptions();
    const areas = options.filter(o => o.group === 'AREA' && o.active !== 'FALSE');
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
