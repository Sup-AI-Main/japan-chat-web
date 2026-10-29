"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_ACTIVITY_EVENT, type AdminActivity } from "@/lib/admin-activity";

type Failure = { code: string; message: string; status?: number };

const ERROR_EXPLANATIONS: Record<string, string> = {
  NOT_FOUND: "대상 데이터가 없거나 이미 삭제되었습니다. 화면을 새로고침해 확인해 주세요.",
  UNAUTHORIZED: "관리자 세션이 만료되었거나 인증되지 않았습니다. 다시 로그인해 주세요.",
  CONFLICT: "다른 변경과 충돌했습니다. 최신 데이터를 확인한 후 다시 시도해 주세요.",
  STALE_VERSION: "화면의 데이터가 오래되었습니다. 최신 내용을 불러온 후 다시 시도해 주세요.",
  DUPLICATE_CODE: "같은 코드의 데이터가 이미 존재합니다.",
  BAD_REQUEST: "입력값을 확인해 주세요.",
  SERVER_ERROR: "서버 또는 데이터베이스 처리 중 오류가 발생했습니다.",
  NETWORK_ERROR: "서버에 연결하지 못했습니다. 네트워크 상태를 확인해 주세요.",
  INVALID_RESPONSE: "서버가 성공 응답을 보냈지만 처리 결과는 실패로 표시했습니다.",
};

export function AdminActivityProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const pending = useRef(new Set<number>());
  const busyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showBusy, setShowBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);

  useEffect(() => {
    const onActivity = (event: Event) => {
      const activity = (event as CustomEvent<AdminActivity>).detail;
      if (activity.kind === "toast") {
        setToast(activity.message);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 2000);
        return;
      }
      if (activity.kind === "start") {
        pending.current.add(activity.id);
        if (!busyTimer.current) busyTimer.current = setTimeout(() => setShowBusy(true), 250);
        return;
      }
      pending.current.delete(activity.id);
      if (pending.current.size === 0) {
        if (busyTimer.current) clearTimeout(busyTimer.current);
        busyTimer.current = null;
        setShowBusy(false);
      }
      if (activity.kind === "failure") {
        setFailure({ code: activity.code, message: activity.message, status: activity.status });
        setToast(activity.mutation ? "데이터 수정 실패" : "데이터 로딩 실패");
        if (activity.code === "NOT_FOUND" && activity.mutation) {
          startTransition(() => router.refresh());
        }
      } else if (activity.mutation) {
        setToast("데이터 수정 완료");
        startTransition(() => router.refresh());
      }
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 2000);
    };
    window.addEventListener(ADMIN_ACTIVITY_EVENT, onActivity);
    return () => {
      window.removeEventListener(ADMIN_ACTIVITY_EVENT, onActivity);
      if (busyTimer.current) clearTimeout(busyTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [router]);

  return <>
    {children}
    {(showBusy || isRefreshing) && <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-[3000] min-w-[230px] rounded-xl border border-border bg-surface px-5 py-4 shadow-xl">
      <div className="flex items-center gap-3 text-sm font-semibold text-text"><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />{isRefreshing ? "화면 동기화 중" : "데이터 처리 중"}</div>
      <ol className="mt-3 space-y-1.5 text-xs text-muted">
        <li className="text-primary">✓ 요청 전송</li>
        <li className={isRefreshing ? "text-primary" : "font-medium text-text"}>{isRefreshing ? "✓" : "●"} 서버 응답 {isRefreshing ? "확인" : "대기"}</li>
        <li className={isRefreshing ? "font-medium text-text" : ""}>{isRefreshing ? "●" : "○"} 화면 데이터 갱신</li>
      </ol>
    </div>}
    {toast && <div role="status" aria-live="polite" className="fixed top-5 left-1/2 z-[3001] -translate-x-1/2 rounded-full bg-text px-5 py-3 text-sm font-medium text-white shadow-xl">{toast}</div>}
    {failure && <div role="dialog" aria-modal="true" aria-labelledby="admin-error-title" className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
        <h2 id="admin-error-title" className="text-lg font-bold text-text">요청을 완료하지 못했습니다</h2>
        <p className="mt-3 text-sm leading-6 text-muted">{failure.message}</p>
        {ERROR_EXPLANATIONS[failure.code] && <p className="mt-2 text-sm leading-6 text-text">{ERROR_EXPLANATIONS[failure.code]}</p>}
        <p className="mt-3 rounded-lg bg-bg px-3 py-2 font-mono text-xs text-muted">오류 코드: {failure.code}{failure.status ? ` · HTTP ${failure.status}` : ""}</p>
        <button type="button" onClick={() => setFailure(null)} className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">확인</button>
      </div>
    </div>}
  </>;
}
