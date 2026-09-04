import Link from "next/link";
import { getActiveAreas, getCommonCategories } from "@/lib/google-sheets";
import { getAreaEmoji, getCategoryEmoji } from "@/lib/display";
import AdminLoginButton from "@/components/AdminLoginButton";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const areas = (await getActiveAreas()).filter(
    (a) => a.code !== "ALL"
  );
  const commonCategories = await getCommonCategories();

  return (
    <main className="page-bg bg-main min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <AdminLoginButton />
      <div className="w-full max-w-[720px] mx-auto text-center">
        <h1 className="text-[28px] font-bold text-text mb-2">
          🇯🇵 일본 골프 여행 가이드
        </h1>
        <p className="text-muted text-[16px] mb-8">여행 지역을 선택하세요</p>

        <div className="flex flex-col gap-4 mb-10">
          {areas.map((area) => (
            <Link
              key={area.code}
              href={`/${area.code.toLowerCase()}`}
              className="block bg-surface border border-border rounded-[12px] p-6 text-center hover:border-primary hover:bg-primary-soft transition-colors"
            >
              <span className="text-[24px] block mb-1">
                {getAreaEmoji(area.code)}
              </span>
              <span className="text-[20px] font-bold text-text block mb-1">
                {area.label}
              </span>
              {area.description && (
                <span className="text-[14px] text-muted">{area.description}</span>
              )}
            </Link>
          ))}
        </div>

        {commonCategories.length > 0 && (
          <div className="border-t border-border pt-8">
            <h2 className="text-[18px] font-bold text-text mb-4">
              📋 공통 안내
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {commonCategories.map((cat) => (
                <Link
                  key={cat.code}
                  href={`/guide/${cat.code.toLowerCase()}`}
                  className="block bg-surface border border-border rounded-[12px] p-4 text-center hover:border-primary transition-colors"
                >
                  <span className="text-[16px] font-medium text-text">
                    {getCategoryEmoji(cat.code)} {cat.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
