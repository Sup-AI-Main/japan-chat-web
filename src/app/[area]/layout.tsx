import { getActiveAreas } from "@/lib/google-sheets";

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
  const areas = await getActiveAreas();
  const currentArea = areas.find((a) => a.code.toLowerCase() === area);
  const bgClass = currentArea ? (AREA_BG[currentArea.code] ?? "bg-main") : "bg-main";

  return (
    <div className={`page-bg ${bgClass} min-h-screen`}>
      {children}
    </div>
  );
}
