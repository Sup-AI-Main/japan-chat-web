import { getActiveAreas, getCommonCategories, getAdminOptions } from "@/lib/google-sheets";
import HomeContentClient from "@/components/HomeContentClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const allOptions = await getAdminOptions();

  const areas = allOptions
    .filter((o) => o.option_type === "AREA" && o.active !== "FALSE" && o.code !== "ALL")
    .sort((a, b) => a.sort - b.sort);

  const commonCategories = allOptions
    .filter((o) => o.option_type === "CATEGORY" && o.group === "COMMON" && o.active !== "FALSE")
    .sort((a, b) => a.sort - b.sort);

  return (
    <main className="page-bg bg-main min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[720px] mx-auto text-center">
        <h1 className="text-[28px] font-bold text-text mb-2">
          🇯🇵 일본 골프 여행 가이드
        </h1>
        <p className="text-muted text-[16px] mb-8">여행 지역을 선택하세요</p>

        <HomeContentClient
          initialAreas={areas}
          initialCategories={commonCategories}
        />
      </div>
    </main>
  );
}