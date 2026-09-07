import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-bg bg-main min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[720px] mx-auto text-center">
        <div className="bg-surface rounded-[20px] shadow-sm px-8 py-14">
          <p className="text-[64px] mb-4">🌸</p>
          <h1 className="text-[24px] font-bold text-text mb-3">
            페이지를 찾을 수 없습니다
          </h1>
          <p className="text-[14px] text-muted mb-1 leading-relaxed">
            요청하신 페이지가 존재하지 않거나
          </p>
          <p className="text-[14px] text-muted mb-8 leading-relaxed">
            삭제된 안내일 수 있습니다.
          </p>
          <Link
            href="/"
            className="inline-block bg-text text-white text-[14px] font-medium px-6 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            🏠 홈으로 이동
          </Link>
        </div>
      </div>
    </main>
  );
}