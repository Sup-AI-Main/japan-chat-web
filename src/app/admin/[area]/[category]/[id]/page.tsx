import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import {
  getFaqById,
  getAdminOptions,
  getGolfCourses,
  getHotels,
  getRestaurants,
} from "@/lib/google-sheets";
import FaqForm from "../FaqForm";

const VALID_AREAS = ["dos", "beppu", "all"];
const AREA_LABELS: Record<string, string> = {
  dos: "도스",
  beppu: "벳푸",
  all: "공통",
};

const CATEGORY_SLUG_MAP: Record<string, string> = {
  golf: "GOLF",
  hotel: "HOTEL",
  onsen: "ONSEN",
  driver: "DRIVER",
  restaurant: "RESTAURANT",
  general: "GENERAL",
  refund: "REFUND",
  money: "MONEY",
  extra_payment: "EXTRA_PAYMENT",
};

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

export default async function EditFaqPage({
  params,
}: {
  params: Promise<{ area: string; category: string; id: string }>;
}) {
  const { area, category, id } = await params;
  if (!VALID_AREAS.includes(area)) notFound();

  const categoryCode = CATEGORY_SLUG_MAP[category];
  if (!categoryCode) notFound();

  const authed = await isAuthenticated();
  if (!authed) redirect("/admin");

  const areaCode = area.toUpperCase();

  // Get existing FAQ
  let faq;
  try {
    faq = await getFaqById(id);
  } catch {
    notFound();
  }
  if (!faq) notFound();

  // Get category label
  let categoryLabel = category;
  try {
    const options = await getAdminOptions();
    const catOption = options.find(
      (o) => o.option_type === "CATEGORY" && o.code === categoryCode
    );
    if (catOption) categoryLabel = catOption.label;
  } catch {
    // fallback
  }

  const relatedTypes = RELATED_TYPE_MAP[categoryCode] || [];

  // Get place options
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
          className="text-[14px] text-muted hover:text-primary mb-2 inline-block"
        >
          ← {AREA_LABELS[area]} &gt; {categoryLabel}
        </Link>

        <h1 className="text-[24px] font-bold text-text mb-6">질문 수정</h1>

        <FaqForm
          area={area}
          category={category}
          categoryCode={categoryCode}
          categoryLabel={categoryLabel}
          areaLabel={AREA_LABELS[area]}
          relatedTypes={relatedTypes}
          places={places}
          initialData={{
            id: faq.id,
            question: faq.question,
            answer: faq.answer,
            question_scope: faq.question_scope,
            related_type: faq.related_type,
            related_id: faq.related_id,
            active: faq.active,
          }}
        />
      </div>
    </main>
  );
}