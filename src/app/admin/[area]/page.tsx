import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { getAdminOptions } from "@/lib/google-sheets";
import { getAreaEmoji, getCategoryEmoji, getCategoryColor, getCategoryBg, getCategoryBorder, AREA_CATEGORIES, COMMON_CATEGORIES } from "@/lib/display";

export default async function AdminAreaPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;

  const authed = await isAuthenticated();
  if (!authed) redirect("/admin");

  const allOptions = await getAdminOptions();

  const areas = allOptions.filter((o) => o.option_type === "AREA" && o.active !== "FALSE");
  const currentArea = areas.find((a) => a.code.toLowerCase() === area);
  if (!currentArea) notFound();

  const areaCode = currentArea.code;

  // 지역별 카테고리 필터링
  // ALL → 공통 카테고리 (온천, 차량, 환불, 환전, 추가결제, 기타)
  // DOS/BEPPU → 지역별 카테고리 (골프장, 호텔, 맛집)
  const targetCategories = areaCode === "ALL" ? COMMON_CATEGORIES : AREA_CATEGORIES;

  const categories = allOptions
    .filter((o) => o.option_type === "CATEGORY" && o.active !== "FALSE" && targetCategories.includes(o.code))
    .sort((a, b) => a.sort - b.sort);

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[900px] mx-auto">
        <Link
          href="/admin/home"
          className="text-[14px] text-muted hover:text-primary mb-2 inline-flex items-center min-h-[44px]"
        >
          ← 지역 선택
        </Link>

        <h1 className="text-[24px] font-bold text-text mb-2">
          {getAreaEmoji(currentArea.code)} {currentArea.label}
        </h1>
        <p className="text-[16px] text-muted mb-6">
          어떤 질문을 관리할까요?
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/admin/${area}/${cat.code.toLowerCase()}`}
              className="rounded-[12px] p-4 text-center transition-colors min-h-[56px] flex items-center justify-center"
              style={{
                backgroundColor: getCategoryBg(cat.code),
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: getCategoryBorder(cat.code),
              }}
            >
              <span className="text-[16px] font-medium whitespace-nowrap" style={{ color: getCategoryColor(cat.code) }}>
                {getCategoryEmoji(cat.code)} {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
