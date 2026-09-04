"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { FaqItem } from "@/lib/types";
import { getCategoryBorder } from "@/lib/display";

interface Props {
  area: string;
  category: string;
  faqs: FaqItem[];
  categoryLabel: string;
  categoryCode: string;
}

export default function AdminFaqList({ area, category, faqs: initialFaqs, categoryLabel, categoryCode }: Props) {
  const [faqs, setFaqs] = useState(initialFaqs);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  // 삭제 모달
  const [deleteTarget, setDeleteTarget] = useState<FaqItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = faqs.filter(
    (f) =>
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase()) ||
      f.related_name.toLowerCase().includes(search.toLowerCase())
  );

  // 서버에서 최신 질문 목록 fetch (숨김 포함)
  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/faq?area=${encodeURIComponent(area)}&category=${encodeURIComponent(category)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("질문 목록 조회 실패");
      const data = await res.json();
      setFaqs(data.faqs);
    } catch {
      setMessage("질문 목록을 새로고침하지 못했습니다.");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoading(false);
    }
  }, [area, category]);

  const handleToggle = async (id: string, currentActive: string) => {
    setActingId(id);
    try {
      const res = await fetch("/api/admin/faq/toggle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          active: currentActive === "TRUE" ? "FALSE" : "TRUE",
        }),
      });

      if (res.ok) {
        await fetchFaqs();
        setMessage(currentActive === "TRUE" ? "숨김 처리되었습니다." : "다시 표시됩니다.");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("처리에 실패했습니다. 다시 시도해 주세요.");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("처리 중 문제가 발생했습니다.");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setActingId(null);
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= faqs.length) return;

    setActingId(faqs[index].id);
    const ids = [...faqs];
    [ids[index], ids[newIndex]] = [ids[newIndex], ids[index]];
    const idList = ids.map((f) => f.id);

    try {
      const res = await fetch("/api/admin/faq/sort", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idList }),
      });

      if (res.ok) {
        await fetchFaqs();
        setMessage("순서가 변경되었습니다.");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("정렬 저장에 실패했습니다. 다시 시도해 주세요.");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("정렬 저장 중 문제가 발생했습니다.");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/faq", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });

      if (res.ok) {
        setDeleteTarget(null);
        await fetchFaqs();
        setMessage("질문이 삭제되었습니다.");
        setTimeout(() => setMessage(""), 3000);
      } else {
        const data = await res.json();
        setMessage(data.error || "질문을 삭제하지 못했습니다. 다시 시도해 주세요.");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("삭제 중 문제가 발생했습니다. 다시 시도해 주세요.");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="질문 검색..."
          className="w-full border border-border rounded-[10px] px-4 py-3 text-[16px] focus:outline-none focus:border-primary"
        />
      </div>

      {/* Message */}
      {message && (
        <div className="bg-primary-soft border border-primary/20 rounded-[8px] p-3 mb-4 text-[14px] text-primary">
          {message}
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="text-center py-4 text-[14px] text-muted">
          불러오는 중...
        </div>
      )}

      {/* FAQ List */}
      {!loading && filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted mb-4">등록된 질문이 없습니다.</p>
          <Link
            href={`/admin/${area}/${category}/new`}
            className="text-primary hover:underline inline-flex items-center min-h-[44px] px-2"
          >
            첫 질문 추가하기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((faq, index) => {
            const busy = actingId === faq.id;
            return (
              <div
                key={faq.id}
                className={`bg-surface rounded-[12px] p-4 ${busy ? "opacity-60" : ""}`}
                style={{ borderWidth: "2px", borderStyle: "solid", borderColor: getCategoryBorder(categoryCode) }}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-medium text-text mb-1 line-clamp-2">
                      {faq.question}
                    </p>
                    {faq.related_name && (
                      <p className="text-[14px] text-muted mb-1">
                        {faq.related_name}
                      </p>
                    )}
                    <span
                      className={`text-[13px] ${
                        faq.active === "TRUE"
                          ? "text-success"
                          : "text-muted"
                      }`}
                    >
                      {faq.active === "TRUE" ? "노출중" : "숨김"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={() => handleMove(index, "up")}
                    disabled={index === 0 || busy}
                    className="px-3 py-2 text-[13px] border border-border rounded-[8px] hover:bg-bg disabled:opacity-30 min-h-[44px] cursor-pointer"
                  >
                    ↑ 위로
                  </button>
                  <button
                    onClick={() => handleMove(index, "down")}
                    disabled={index === faqs.length - 1 || busy}
                    className="px-3 py-2 text-[13px] border border-border rounded-[8px] hover:bg-bg disabled:opacity-30 min-h-[44px] cursor-pointer"
                  >
                    ↓ 아래로
                  </button>
                  <Link
                    href={`/admin/${area}/${category}/${faq.id}`}
                    className="px-3 py-2 text-[13px] border border-border rounded-[8px] hover:bg-bg min-h-[44px] flex items-center"
                  >
                    수정
                  </Link>
                  <button
                    onClick={() => handleToggle(faq.id, faq.active)}
                    disabled={busy}
                    className={`px-3 py-2 text-[13px] border rounded-[8px] min-h-[44px] cursor-pointer ${
                      faq.active === "TRUE"
                        ? "border-warning text-warning hover:bg-warning/10"
                        : "border-success text-success hover:bg-success/10"
                    }`}
                  >
                    {faq.active === "TRUE" ? "숨기기" : "다시 표시"}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(faq)}
                    disabled={busy}
                    className="px-3 py-2 text-[13px] border border-danger/40 text-danger rounded-[8px] hover:bg-danger/10 min-h-[44px] cursor-pointer"
                  >
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteTarget(null);
          }}
        >
          <div className="bg-surface rounded-[16px] shadow-lg w-full max-w-[360px] mx-4 p-6">
            <h2 className="text-[18px] font-bold text-text mb-2">
              질문을 삭제하시겠습니까?
            </h2>
            <p className="text-[14px] text-muted mb-1">
              삭제한 질문은 복구할 수 없습니다.
            </p>
            <p className="text-[14px] text-text mb-5">
              정말 삭제하시겠습니까?
            </p>
            <p className="text-[13px] text-muted mb-5 truncate">
              대상: {deleteTarget.question}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 border border-border py-3 rounded-[10px] text-[15px] font-medium text-muted hover:bg-bg transition-colors min-h-[44px] cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-danger text-white py-3 rounded-[10px] text-[15px] font-medium hover:opacity-90 disabled:opacity-50 min-h-[44px] cursor-pointer"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}