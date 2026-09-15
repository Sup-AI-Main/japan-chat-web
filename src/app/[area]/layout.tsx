import { resolveAreaLayout } from "@/lib/supabase-cms";

export const dynamic = "force-dynamic";

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
