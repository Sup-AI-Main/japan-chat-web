import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getActiveAreas } from "@/lib/supabase-cms";
import EntityList from "@/components/admin/EntityList";

export const dynamic = "force-dynamic";

export default async function EntitiesPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin");

  const { area } = await params;
  const areaUp = area.toUpperCase();

  const allAreas = await getActiveAreas();
  const currentArea = allAreas.find((a) => a.code === areaUp);
  if (!currentArea) redirect("/admin/home");

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6">
      <EntityList areaCode={areaUp} />
    </div>
  );
}
