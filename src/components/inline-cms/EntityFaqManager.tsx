"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/types";

interface EntityFaqManagerProps {
  area: string;
  entityType: "GOLF" | "HOTEL" | "RESTAURANT" | "ATTRACTION";
  entityId: string;
  initialFaqs: FaqItem[];
  canManage: boolean;
}

export function EntityFaqManager({ area, entityType, entityId, initialFaqs, canManage }: EntityFaqManagerProps) {
  const [faqs, setFaqs] = useState(initialFaqs);
  const [draft, setDraft] = useState({ question: "", answer: "" });
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  async function addFaq() {
    if (!draft.question.trim() || !draft.answer.trim()) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area: area.toUpperCase(), category: entityType, question_scope: "SPECIFIC",
          question: draft.question.trim(), answer: draft.answer.trim(), active: "TRUE",
          related_type: entityType, related_id: entityId,
        }),
      });
      if (!response.ok) throw new Error("FAQ 저장에 실패했습니다.");
      const result = await response.json() as { data?: { id?: string } };
      setFaqs((current) => [...current, {
        id: result.data?.id ?? crypto.randomUUID(), area: area.toUpperCase(), category: entityType,
        question_scope: "SPECIFIC", question: draft.question.trim(), answer: draft.answer.trim(),
        active: "TRUE", sort: current.length + 1, related_type: entityType, related_id: entityId,
      } as FaqItem]);
      setDraft({ question: "", answer: "" });
      setAdding(false);
    } finally { setBusy(false); }
  }

  async function removeFaq(id: string) {
    if (!window.confirm("이 FAQ를 삭제하시겠습니까?")) return;
    const response = await fetch("/api/admin/faq", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (response.ok) setFaqs((current) => current.filter((faq) => faq.id !== id));
  }

  return (
    <div className="border-t border-border pt-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-bold text-text">자주 묻는 질문</h2>
        {canManage && <button type="button" onClick={() => setAdding((value) => !value)} className="text-primary border border-primary rounded px-3 py-1.5 text-[13px]">{adding ? "− 닫기" : "+ FAQ 추가"}</button>}
      </div>
      {adding && <div className="space-y-2 mb-4 border border-border rounded p-3"><input className="w-full border border-border rounded px-3 py-2 text-[14px]" placeholder="질문" value={draft.question} onChange={(event) => setDraft({ ...draft, question: event.target.value })} /><textarea className="w-full border border-border rounded px-3 py-2 text-[14px]" placeholder="답변" value={draft.answer} onChange={(event) => setDraft({ ...draft, answer: event.target.value })} /><button type="button" disabled={busy} onClick={() => void addFaq()} className="bg-primary text-white rounded px-3 py-2 text-[13px]">저장</button></div>}
      <div className="space-y-2">
        {faqs.map((faq) => <details key={faq.id} className="bg-surface border border-border rounded-[8px] group"><summary className="p-3 flex justify-between items-center font-medium text-[15px] text-text"><span>Q. {faq.question}</span><span className="flex items-center gap-2"><span>▼</span>{canManage && <button type="button" onClick={(event) => { event.preventDefault(); void removeFaq(faq.id); }} className="text-danger text-[13px]">−</button>}</span></summary><div className="px-3 pb-3 text-[15px] text-text leading-[1.6] border-t border-border pt-3">{faq.answer}</div></details>)}
      </div>
    </div>
  );
}
