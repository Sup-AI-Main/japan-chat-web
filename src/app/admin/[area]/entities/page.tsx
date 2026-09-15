import { redirect, notFound } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { resolveArea } from "@/lib/supabase-cms";
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
  const currentArea = await resolveArea(area);
  if (!currentArea) notFound();

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6">
      <EntityList areaCode={currentArea.code} />
    </div>
  );
}
