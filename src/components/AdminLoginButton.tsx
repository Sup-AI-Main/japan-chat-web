"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/hooks/use-admin";
import Link from "next/link";

export default function AdminLoginButton() {
  const isAdmin = useAdmin();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setPassword("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // 로그인 성공: 현재 페이지 유지, 관리자 상태 갱신
        setOpen(false);
        router.refresh();
      } else {
        setError("비밀번호가 올바르지 않습니다.");
      }
    } catch {
      setError("로그인 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 관리자 로그인 상태
  if (isAdmin) {
    return (
      <div className="fixed top-4 right-4 z-[1000] flex items-center gap-2">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 px-3 h-9 rounded-full bg-white/80 backdrop-blur-sm border border-border shadow-sm hover:bg-white/95 transition-colors text-[14px] font-medium text-text cursor-pointer"
        >
          <span className="text-[16px]">⚙️</span>
          <span>관리자 메뉴</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* 비로그인: 설정 아이콘만 표시 */}
      <button
        onClick={() => setOpen(true)}
        aria-label="관리자 로그인"
        className="fixed top-4 right-4 z-[1000] w-9 h-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm border border-border shadow-sm hover:bg-white/95 transition-colors text-[18px] cursor-pointer"
      >
        ⚙️
      </button>

      {/* 로그인 모달 */}
      {open && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-surface rounded-[16px] shadow-lg w-full max-w-[360px] mx-4 p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-[18px] font-bold text-text">🔐 관리자 로그인</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg transition-colors text-muted text-[18px] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full border border-border rounded-[10px] px-4 py-3 text-[16px] focus:outline-none focus:border-primary mb-3"
                required
              />

              {error && (
                <p className="text-[14px] text-danger mb-3">{error}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 border border-border py-3 rounded-[10px] text-[15px] font-medium text-muted hover:bg-bg transition-colors min-h-[44px] cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary text-white py-3 rounded-[10px] text-[15px] font-medium hover:opacity-90 disabled:opacity-50 min-h-[44px] cursor-pointer"
                >
                  {loading ? "로그인 중..." : "로그인"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}