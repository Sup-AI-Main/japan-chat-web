import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[720px] mx-auto text-center">
        <h1 className="text-[28px] font-bold text-text mb-2">
          일본 골프 여행 가이드
        </h1>
        <p className="text-muted text-[16px] mb-12">여행 지역을 선택하세요</p>

        <div className="flex flex-col gap-4">
          <Link
            href="/dos"
            className="block bg-surface border border-border rounded-[12px] p-6 text-center hover:border-primary hover:bg-primary-soft transition-colors"
          >
            <span className="text-[20px] font-bold text-text block mb-1">
              도스
            </span>
            <span className="text-[14px] text-muted">후쿠오카 · 도스 골프</span>
          </Link>

          <Link
            href="/beppu"
            className="block bg-surface border border-border rounded-[12px] p-6 text-center hover:border-primary hover:bg-primary-soft transition-colors"
          >
            <span className="text-[20px] font-bold text-text block mb-1">
              벳푸
            </span>
            <span className="text-[14px] text-muted">벳푸 골프</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
