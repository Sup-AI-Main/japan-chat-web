"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <main className="page-bg bg-main min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[720px] mx-auto text-center">
        <div className="bg-surface rounded-[20px] shadow-sm px-8 py-14">
          <p className="text-[64px] mb-4">⚠️</p>
          <h1 className="text-[24px] font-bold text-text mb-3">
            일시적인 오류가 발생했습니다
          </h1>
          <p className="text-[14px] text-muted mb-8 leading-relaxed">
            데이터를 불러오는 중 문제가 발생했습니다.
            <br />
            잠시 후 다시 시도해주세요.
          </p>
          <button
            onClick={reset}
            className="inline-block bg-text text-white text-[14px] font-medium px-6 py-3 rounded-full hover:opacity-90 transition-opacity cursor-pointer"
          >
            다시 시도
          </button>
        </div>
      </div>
    </main>
  );
}
