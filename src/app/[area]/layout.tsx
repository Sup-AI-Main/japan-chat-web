import { getActiveAreas } from "@/lib/supabase-cms";

export const dynamic = "force-dynamic";

const AREA_BG: Record<string, string> = {
  DOS: "bg-dos",
  BEPPU: "bg-beppu",
  ALL: "bg-main",
};

export default async function AreaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  const areaUp = area.toUpperCase();

  let bgClass = "bg-main";
  try {
    const areas = await getActiveAreas();
    const currentArea = areas.find((a) => a.code === areaUp);
    if (currentArea) bgClass = AREA_BG[currentArea.code] ?? "bg-main";
  } catch {
    if (AREA_BG[areaUp]) bgClass = AREA_BG[areaUp];
  }

  return (
    <div className={`page-bg ${bgClass} min-h-screen`}>
      {children}
    </div>
  );
}
