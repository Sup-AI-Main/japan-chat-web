export function PageLoading() {
  return <main role="status" aria-live="polite" className="mx-auto w-full max-w-5xl px-5 py-10">
    <div className="mb-7 h-8 w-48 animate-pulse rounded-lg bg-border" />
    <div className="grid gap-4 sm:grid-cols-2">
      {[0, 1, 2, 3].map((item) => <div key={item} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-5 h-5 w-2/3 animate-pulse rounded bg-border" />
        <div className="mb-3 h-3 w-full animate-pulse rounded bg-bg" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-bg" />
      </div>)}
    </div>
    <p className="mt-6 text-center text-sm text-muted">데이터를 불러오는 중입니다…</p>
  </main>;
}
