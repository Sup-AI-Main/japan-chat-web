import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { getFaq, getAdminOptions } from "@/lib/google-sheets";
import type { FaqItem } from "@/lib/types";
import AdminFaqList from "./AdminFaqList";

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

export default async function AdminCategoryPage({
  params,
}: {
  params: Promise<{ area: string; category: string }>;
}) {
  const { area, category } = await params;
  if (!VALID_AREAS.includes(area)) notFound();

  const categoryCode = CATEGORY_SLUG_MAP[category];
  if (!categoryCode) notFound();

  const authed = await isAuthenticated();
  if (!authed) redirect("/admin");

  // Get category label from admin_options
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

  const areaCode = area.toUpperCase();
  let faqs: FaqItem[] = [];
  try {
    faqs = await getFaq(areaCode === "ALL" ? undefined : areaCode, categoryCode);
    if (areaCode === "ALL") {
      faqs = faqs.filter((f) => f.area === "ALL");
    }
  } catch {
    faqs = [];
  }

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[900px] mx-auto">
        <Link
          href={`/admin/${area}`}
          className="text-[14px] text-muted hover:text-primary mb-2 inline-block"
        >
          ← {AREA_LABELS[area]}
        </Link>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <h1 className="text-[20px] sm:text-[24px] font-bold text-text">
            {AREA_LABELS[area]} &gt; {categoryLabel}
          </h1>
          <Link
            href={`/admin/${area}/${category}/new`}
            className="bg-primary text-white px-4 py-3 rounded-[10px] text-[14px] font-medium hover:opacity-90 min-h-[44px] flex items-center justify-center sm:justify-start whitespace-nowrap"
          >
            + 질문 추가
          </Link>
        </div>

        <AdminFaqList
          area={area}
          category={category}
          faqs={faqs}
          categoryLabel={categoryLabel}
        />
      </div>
    </main>
  );
}