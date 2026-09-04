import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";

const VALID_AREAS = ["dos", "beppu", "all"];
const AREA_LABELS: Record<string, string> = {
  dos: "도스",
  beppu: "벳푸",
  all: "공통",
};

const CATEGORIES = [
  { slug: "golf", label: "골프장" },
  { slug: "hotel", label: "호텔" },
  { slug: "onsen", label: "온천" },
  { slug: "driver", label: "차량" },
  { slug: "restaurant", label: "맛집" },
  { slug: "general", label: "기타" },
  { slug: "refund", label: "환불" },
  { slug: "money", label: "환전" },
  { slug: "extra_payment", label: "추가결제" },
];

export default async function AdminAreaPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!VALID_AREAS.includes(area)) notFound();

  const authed = await isAuthenticated();
  if (!authed) redirect("/admin");

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[900px] mx-auto">
        <Link
          href="/admin/home"
          className="text-[14px] text-muted hover:text-primary mb-2 inline-block"
        >
          ← 지역 선택
        </Link>

        <h1 className="text-[24px] font-bold text-text mb-2">
          {AREA_LABELS[area]}
        </h1>
        <p className="text-[16px] text-muted mb-6">
          어떤 질문을 관리할까요?
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/admin/${area}/${cat.slug}`}
              className="bg-surface border border-border rounded-[12px] p-4 text-center hover:border-primary hover:bg-primary-soft transition-colors min-h-[56px] flex items-center justify-center"
            >
              <span className="text-[16px] font-medium text-text">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}