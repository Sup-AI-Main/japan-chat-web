import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import {
  getAdminOptions,
  getGolfCourses,
  getHotels,
  getRestaurants,
} from "@/lib/google-sheets";
import FaqForm from "../FaqForm";

export default async function NewFaqPage({
  params,
}: {
  params: Promise<{ area: string; category: string }>;
}) {
  const { area, category } = await params;

  const authed = await isAuthenticated();
  if (!authed) redirect("/admin");

  const options = await getAdminOptions();

  const currentArea = options.find(
    (o) => o.option_type === "AREA" && o.code.toLowerCase() === area && o.active !== "FALSE"
  );
  if (!currentArea) notFound();

  const currentCategory = options.find(
    (o) => o.option_type === "CATEGORY" && o.code.toLowerCase() === category && o.active !== "FALSE"
  );
  if (!currentCategory) notFound();

  const areaCode = currentArea.code;
  const categoryCode = currentCategory.code;
  const areaLabel = currentArea.label;
  const categoryLabel = currentCategory.label;

  const RELATED_TYPE_MAP: Record<string, string[]> = {
    GOLF: ["GOLF"],
    HOTEL: ["HOTEL"],
    ONSEN: ["HOTEL"],
    DRIVER: ["GOLF", "HOTEL"],
    RESTAURANT: ["RESTAURANT"],
    GENERAL: [],
    REFUND: [],
    MONEY: [],
    EXTRA_PAYMENT: ["GOLF", "HOTEL"],
  };

  const relatedTypes = RELATED_TYPE_MAP[categoryCode] || [];

  const places: { type: string; id: string; name: string }[] = [];
  try {
    if (relatedTypes.includes("GOLF")) {
      const courses = await getGolfCourses(areaCode === "ALL" ? undefined : areaCode);
      courses.forEach((c) =>
        places.push({ type: "GOLF", id: c.id, name: c.display_name || c.official_name })
      );
    }
    if (relatedTypes.includes("HOTEL")) {
      const hotels = await getHotels(areaCode === "ALL" ? undefined : areaCode);
      hotels.forEach((h) =>
        places.push({ type: "HOTEL", id: h.id, name: h.official_name })
      );
    }
    if (relatedTypes.includes("RESTAURANT")) {
      const restaurants = await getRestaurants(areaCode === "ALL" ? undefined : areaCode);
      restaurants.forEach((r) =>
        places.push({ type: "RESTAURANT", id: r.id, name: r.name })
      );
    }
  } catch {
    // fallback
  }

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[900px] mx-auto">
        <Link
          href={`/admin/${area}/${category}`}
          className="text-[14px] text-muted hover:text-primary mb-2 inline-flex items-center min-h-[44px]"
        >
          ← {areaLabel} &gt; {categoryLabel}
        </Link>

        <h1 className="text-[24px] font-bold text-text mb-6">새 질문</h1>

        <FaqForm
          area={area}
          category={category}
          categoryCode={categoryCode}
          categoryLabel={categoryLabel}
          areaLabel={areaLabel}
          relatedTypes={relatedTypes}
          places={places}
        />
      </div>
    </main>
  );
}
