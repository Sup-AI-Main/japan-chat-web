import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { getAdminOptions } from "@/lib/supabase-cms";
import { getAreaEmoji, getCategoryEmoji, getCategoryColor, getCategoryBg, getCategoryBorder, GROUP_AREA, GROUP_COMMON } from "@/lib/display";

export default async function AdminAreaPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  const areaUp = area.toUpperCase();

  const authed = await isAuthenticated();
  if (!authed) redirect("/admin");

  const allOptions = await getAdminOptions();

  const areas = allOptions.filter((o) => o.option_type === "AREA" && o.active !== "FALSE");
  const currentArea = areas.find((a) => a.code === areaUp);
  if (!currentArea) notFound();

  const areaCode = currentArea.code;

  // group 필드 기반 카테고리 필터링 (admin_options에서 동적으로)
  // ALL → group=COMMON 카테고리
  // DOS/BEPPU → group=AREA 카테고리
  const targetGroup = areaCode === "ALL" ? GROUP_COMMON : GROUP_AREA;

  const categories = allOptions
    .filter((o) => o.option_type === "CATEGORY" && o.active !== "FALSE" && o.group === targetGroup)
    .sort((a, b) => a.sort - b.sort);

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[900px] mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/"
            className="text-[14px] text-muted hover:text-primary min-h-[44px] flex items-center"
          >
            ← 홈
          </Link>
          <Link
            href="/admin/home"
            className="text-[14px] text-muted hover:text-primary min-h-[44px] flex items-center"
          >
            지역 선택
          </Link>
        </div>

        <h1 className="text-[24px] font-bold text-text mb-2">
          {getAreaEmoji(currentArea.code)} {currentArea.label}
        </h1>
        <p className="text-[16px] text-muted mb-6">
          어떤 질문을 관리할까요?
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.code}
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

        {areaCode !== "ALL" && (
          <div className="mt-8 border-t border-border pt-6">
            <h2 className="text-[17px] font-bold text-text mb-3">시설 관리</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href={`/admin/${area}/entities`}
                className="rounded-[12px] border-2 border-primary/40 bg-primary-soft p-4 text-center hover:border-primary transition-colors min-h-[56px] flex items-center justify-center"
              >
                <span className="text-[15px] font-medium text-primary">
                  📋 전체 콘텐츠 관리
                </span>
              </Link>
              <Link
                href={`/admin/${area}/manage`}
                className="rounded-[12px] border-2 border-border bg-surface p-4 text-center hover:border-primary transition-colors min-h-[56px] flex items-center justify-center"
              >
                <span className="text-[15px] font-medium text-text">
                  호텔 / 골프장 / 이동시간 관리
                </span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
