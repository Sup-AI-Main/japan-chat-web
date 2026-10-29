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
    <main className="min-h-screen bg-bg">
      <div role="alertdialog" aria-modal="true" aria-labelledby="render-error-title" className="fixed inset-0 flex items-center justify-center bg-black/45 px-4">
        <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
          <h1 id="render-error-title" className="text-lg font-bold text-text">페이지를 불러오지 못했습니다</h1>
          <p className="mt-3 text-sm leading-6 text-muted">서버에서 데이터를 읽거나 화면을 구성하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
          <p className="mt-3 rounded-lg bg-bg px-3 py-2 font-mono text-xs text-muted">오류 코드: {error.digest ?? "RENDER_ERROR"}</p>
          <button onClick={reset} className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">다시 시도</button>
        </div>
      </div>
    </main>
  );
}
