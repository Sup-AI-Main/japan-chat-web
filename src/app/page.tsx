import Link from "next/link";
import { getActiveAreas } from "@/lib/google-sheets";
import { getAreaEmoji } from "@/lib/display";

export default async function HomePage() {
  const areas = (await getActiveAreas()).filter(
    (a) => a.code !== "ALL"
  );

  return (
    <main className="page-bg bg-main min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[720px] mx-auto text-center">
        <h1 className="text-[28px] font-bold text-text mb-2">
          🇯🇵 일본 골프 여행 가이드
        </h1>
        <p className="text-muted text-[16px] mb-12">여행 지역을 선택하세요</p>

        <div className="flex flex-col gap-4">
          {areas.map((area) => (
            <Link
              key={area.id}
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
      </div>
    </main>
  );
}
