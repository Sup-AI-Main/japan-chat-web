import { redirect, notFound } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getHotels, getGolfCourses, resolveArea, getTravelTimes } from "@/lib/supabase-cms";
import { getActiveAreas } from "@/lib/area";
import ManageEntitiesClient from "./ManageEntitiesClient";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function ManagePage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const authed = await isAuthenticated();
  if (!authed) redirect(routes.admin());

  const { area } = await params;
  const currentArea = await resolveArea(area);
  if (!currentArea) notFound();

  const areaCode = currentArea.code;

  const [hotels, golfCourses, travelTimes, allAreas] = await Promise.all([
    getHotels(areaCode).catch(() => []),
    getGolfCourses(areaCode).catch(() => []),
    getTravelTimes(areaCode).catch(() => []),
    getActiveAreas().catch(() => []),
  ]);

  return (
    <ManageEntitiesClient
      area={areaCode}
      areaName={currentArea.label}
      initialHotels={hotels}
      initialGolfCourses={golfCourses}
      initialTravelTimes={travelTimes}
      allAreas={allAreas.map((a) => ({
        id: a.id,
        code: a.code,
        name_kr: a.nameKr,
        name_jp: a.description || "",
        icon: a.icon,
        active: a.active,
        sort: a.sort,
      }))}
    />
  );
}