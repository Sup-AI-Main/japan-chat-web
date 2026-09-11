import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getHotels, getGolfCourses, getActiveAreas, getTravelTimes } from "@/lib/supabase-cms";
import ManageEntitiesClient from "./ManageEntitiesClient";

export const dynamic = "force-dynamic";

export default async function ManagePage({
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

  const [hotels, golfCourses, travelTimes] = await Promise.all([
    getHotels(areaUp).catch(() => []),
    getGolfCourses(areaUp).catch(() => []),
    getTravelTimes(areaUp).catch(() => []),
  ]);

  return (
    <ManageEntitiesClient
      area={areaUp}
      areaName={currentArea.label}
      initialHotels={hotels}
      initialGolfCourses={golfCourses}
      initialTravelTimes={travelTimes}
      allAreas={allAreas.map((a) => ({
        id: a.id,
        code: a.code,
        name_kr: a.label,
        name_jp: a.description || "",
        icon: a.icon,
        active: a.active !== "FALSE",
        sort: a.sort,
      }))}
    />
  );
}