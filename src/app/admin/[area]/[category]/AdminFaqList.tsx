"use client";

import { useState } from "react";
import Link from "next/link";
import type { FaqItem } from "@/lib/types";

interface Props {
  area: string;
  category: string;
  faqs: FaqItem[];
  categoryLabel: string;
}

export default function AdminFaqList({ area, category, faqs: initialFaqs, categoryLabel }: Props) {
  const [faqs, setFaqs] = useState(initialFaqs);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const filtered = faqs.filter(
    (f) =>
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase()) ||
      f.related_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = async (id: string, currentActive: string) => {
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
        setFaqs((prev) =>
          prev.map((f) =>
            f.id === id
              ? { ...f, active: currentActive === "TRUE" ? "FALSE" : "TRUE" }
              : f
          )
        );
        setMessage(
          currentActive === "TRUE" ? "숨김 처리되었습니다." : "다시 표시됩니다."
        );
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("처리에 실패했습니다.");
      }
    } catch {
      setMessage("처리 중 문제가 발생했습니다.");
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= faqs.length) return;

    const newFaqs = [...faqs];
    [newFaqs[index], newFaqs[newIndex]] = [newFaqs[newIndex], newFaqs[index]];
    setFaqs(newFaqs);

    try {
      const ids = newFaqs.map((f) => f.id);
      const res = await fetch("/api/admin/faq/sort", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) {
        setMessage("정렬 저장에 실패했습니다.");
        setFaqs(faqs); // revert
      } else {
        setMessage("순서가 변경되었습니다.");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("정렬 저장 중 문제가 발생했습니다.");
      setFaqs(faqs); // revert
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

      {/* FAQ List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted mb-4">등록된 질문이 없습니다.</p>
          <Link
            href={`/admin/${area}/${category}/new`}
            className="text-primary hover:underline"
          >
            첫 질문 추가하기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((faq, index) => (
            <div
              key={faq.id}
              className="bg-surface border border-border rounded-[12px] p-4"
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
                  disabled={index === 0}
                  className="px-3 py-2 text-[13px] border border-border rounded-[8px] hover:bg-bg disabled:opacity-30 min-h-[44px]"
                >
                  ↑ 위로
                </button>
                <button
                  onClick={() => handleMove(index, "down")}
                  disabled={index === faqs.length - 1}
                  className="px-3 py-2 text-[13px] border border-border rounded-[8px] hover:bg-bg disabled:opacity-30 min-h-[44px]"
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
                  className={`px-3 py-2 text-[13px] border rounded-[8px] min-h-[44px] ${
                    faq.active === "TRUE"
                      ? "border-warning text-warning hover:bg-warning/10"
                      : "border-success text-success hover:bg-success/10"
                  }`}
                >
                  {faq.active === "TRUE" ? "숨기기" : "다시 표시"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}