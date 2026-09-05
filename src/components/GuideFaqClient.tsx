"use client";

import { useState } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { AddButton, ConfirmModal } from "@/components/inline-cms";
import { adminFetchJson, ConflictError } from "@/lib/admin-fetch";
import { getCategoryBorder } from "@/lib/display";
import type { FaqItem } from "@/lib/types";

interface GuideFaqClientProps {
  initialFaqs: FaqItem[];
  categoryCode: string;
  categoryLabel: string;
}

function FaqEditModal({
  faq,
  categoryCode,
  open,
  onClose,
  onSaved,
}: {
  faq: FaqItem | null;
  categoryCode: string;
  open: boolean;
  onClose: () => void;
  onSaved: (data: FaqItem) => void;
}) {
  const [question, setQuestion] = useState(faq?.question || "");
  const [answer, setAnswer] = useState(faq?.answer || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      setError("질문과 답변을 모두 입력하세요.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const isEdit = !!faq;
      const payload = {
        ...(isEdit && { id: faq.id }),
        area: "ALL",
        category: categoryCode,
        question_scope: "AREA",
        question: question.trim(),
        answer: answer.trim(),
        active: "TRUE",
      };

      const result = await adminFetchJson<{ id?: string }>("/api/admin/faq", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      onSaved({
        id: result.id || faq?.id || "",
        area: "ALL",
        category: categoryCode,
        question_scope: "AREA",
        question: question.trim(),
        answer: answer.trim(),
        active: "TRUE",
        sort: faq?.sort || 999,
        related_type: "",
        related_id: "",
        related_name: "",
        source_url: "",
        status: "",
        updated_at: new Date().toISOString(),
      });
      onClose();
    } catch (err) {
      if (err instanceof ConflictError) {
        setError("다른 관리자가 먼저 수정했습니다. 최신 데이터를 다시 불러와 주세요.");
      } else {
        setError(err instanceof Error ? err.message : "저장 중 오류 발생");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface rounded-[16px] shadow-lg w-full max-w-[480px] mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-[18px] font-bold text-text">
            {faq ? "질문 수정" : "질문 추가"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg text-muted text-[18px] cursor-pointer">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[14px] font-medium text-text mb-1">질문 *</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="질문을 입력하세요"
              className="w-full border border-border rounded-[10px] px-4 py-3 text-[16px] focus:outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="block text-[14px] font-medium text-text mb-1">답변 *</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="답변을 입력하세요"
              rows={5}
              className="w-full border border-border rounded-[10px] px-4 py-3 text-[16px] focus:outline-none focus:border-primary resize-y"
              required
            />
          </div>
          {error && <p className="text-[14px] text-danger">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-border py-3 rounded-[10px] text-[15px] font-medium text-muted hover:bg-bg min-h-[44px] cursor-pointer">취소</button>
            <button type="submit" disabled={loading} className="flex-1 bg-primary text-white py-3 rounded-[10px] text-[15px] font-medium hover:opacity-90 disabled:opacity-50 min-h-[44px] cursor-pointer">{loading ? "저장 중..." : "저장"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GuideFaqClient({
  initialFaqs,
  categoryCode,
  categoryLabel,
}: GuideFaqClientProps) {
  const [faqs, setFaqs] = useState(initialFaqs);
  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<FaqItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FaqItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const isAdmin = useAdmin();

  const handleAdd = () => {
    setEditTarget(null);
    setEditModal(true);
  };

  const handleEdit = (faq: FaqItem) => {
    setEditTarget(faq);
    setEditModal(true);
  };

  const handleSaved = (saved: FaqItem) => {
    if (editTarget) {
      setFaqs((prev) => prev.map((f) => (f.id === saved.id ? saved : f)));
    } else {
      setFaqs((prev) => [...prev, saved]);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/admin/faq", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (res.ok) {
        setFaqs((prev) => prev.filter((f) => f.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-bold text-text">❓ 자주 묻는 질문</h2>
        {isAdmin && <AddButton onClick={handleAdd} label="질문 추가" />}
      </div>

      {faqs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted">등록된 질문이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {faqs.map((faq) => (
            <div key={faq.id} className="relative group/faq">
              <details
                className="bg-surface rounded-[12px]"
                style={{
                  borderWidth: "2px",
                  borderStyle: "solid",
                  borderColor: getCategoryBorder(categoryCode),
                }}
              >
                <summary className="p-4 flex justify-between items-center font-medium text-[15px] text-text cursor-pointer">
                  <span>Q. {faq.question}</span>
                  <span className="chevron-icon text-muted transition-transform ml-2 shrink-0">▼</span>
                </summary>
                <div className="px-4 pb-4 text-[15px] text-text leading-[1.6] border-t pt-3" style={{ borderColor: getCategoryBorder(categoryCode) }}>
                  {faq.answer}
                </div>
              </details>
              {isAdmin && (
                <div className="absolute top-3 right-10 flex items-center gap-1 opacity-0 group-hover/faq:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(faq)}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/90 border border-border text-[12px] cursor-pointer hover:bg-bg"
                    title="수정"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setDeleteTarget(faq)}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/90 border border-border text-[12px] cursor-pointer hover:bg-danger/10"
                    title="삭제"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <FaqEditModal
        faq={editTarget}
        categoryCode={categoryCode}
        open={editModal}
        onClose={() => { setEditModal(false); setEditTarget(null); }}
        onSaved={handleSaved}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="질문 삭제"
        message={`"${deleteTarget?.question}" 질문을 삭제하시겠습니까?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </>
  );
}