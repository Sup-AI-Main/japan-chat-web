"use client";

import { useState } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { adminFetchJson } from "@/lib/admin-fetch";
import { ConfirmModal } from "@/components/inline-cms";
import { useToast, Toast } from "@/components/Toast";
import { getCategoryEmoji } from "@/lib/display";
import type { FaqItem } from "@/lib/types";

export default function AreaFaqClient({ area, initialFaqs }: { area: string; initialFaqs: FaqItem[] }) {
  const [faqs, setFaqs] = useState(initialFaqs);
  const [target, setTarget] = useState<FaqItem | null>(null);
  const [draft, setDraft] = useState({ category: "GOLF", question: "", answer: "" });
  const [deleteTarget, setDeleteTarget] = useState<FaqItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const isAdmin = useAdmin();
  const { message, visible, showToast } = useToast();

  function openAdd() { setTarget(null); setDraft({ category: "GOLF", question: "", answer: "" }); setModalOpen(true); }
  function openEdit(faq: FaqItem) { setTarget(faq); setDraft({ category: faq.category, question: faq.question, answer: faq.answer }); setModalOpen(true); }
  async function save() {
    if (!draft.question.trim() || !draft.answer.trim()) return showToast("질문과 답변을 모두 입력하세요.");
    setSaving(true);
    try {
      const result = await adminFetchJson<{ success: true; data: { id?: string } }>("/api/admin/faq", {
        method: target ? "PUT" : "POST",
        body: JSON.stringify({ ...(target ? { id: target.id } : {}), area: area.toUpperCase(), category: draft.category, question_scope: "AREA", question: draft.question.trim(), answer: draft.answer.trim(), active: "TRUE" }),
      });
      const saved: FaqItem = { id: result.data?.id || target?.id || crypto.randomUUID(), area: area.toUpperCase(), category: draft.category, question_scope: "AREA", question: draft.question.trim(), answer: draft.answer.trim(), active: "TRUE", sort: target?.sort || faqs.length + 1, related_type: "", related_id: "", related_name: "", source_url: "", status: "", updated_at: new Date().toISOString() };
      setFaqs((current) => target ? current.map((faq) => faq.id === target.id ? saved : faq) : [...current, saved]);
      setTarget(null); setModalOpen(false); showToast("FAQ가 저장되었습니다.");
    } catch (error) { showToast(error instanceof Error ? error.message : "저장에 실패했습니다."); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!deleteTarget) return;
    const response = await fetch("/api/admin/faq", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleteTarget.id }) });
    if (response.ok) { setFaqs((current) => current.filter((faq) => faq.id !== deleteTarget.id)); setDeleteTarget(null); showToast("FAQ가 삭제되었습니다."); }
    else showToast("삭제에 실패했습니다.");
  }

  return <>
    <div className="border-t border-border pt-6">
      <div className="flex items-center justify-between mb-4"><h2 className="text-[18px] font-bold text-text">❓ 자주 찾는 질문</h2>{isAdmin && <button type="button" onClick={openAdd} className="bg-primary text-white rounded px-3 py-2 text-[13px]">＋ 질문 추가</button>}</div>
      <div className="space-y-2">{faqs.map((faq) => <details key={faq.id} className="bg-surface border border-border rounded-[8px] group"><summary className="p-3 text-[15px] text-text cursor-pointer list-none flex items-center justify-between gap-2"><span>{getCategoryEmoji(faq.category)} {faq.question}</span><span className="flex gap-2">{isAdmin && <span onClick={(event) => { event.preventDefault(); openEdit(faq); }} className="text-primary cursor-pointer">수정</span>}{isAdmin && <span onClick={(event) => { event.preventDefault(); setDeleteTarget(faq); }} className="text-danger cursor-pointer">삭제</span>}<span>▼</span></span></summary><div className="px-3 pb-3 pt-2 text-[15px] text-text leading-[1.6] border-t border-border">{faq.answer}</div></details>)}</div>
    </div>
    {isAdmin && modalOpen && <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40"><div className="bg-surface rounded-[16px] p-6 w-full max-w-[640px] mx-4 space-y-3"><h2 className="font-bold">{target ? "질문 수정" : "질문 추가"}</h2><select className="w-full border border-border rounded px-3 py-2" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option value="GOLF">골프장</option><option value="HOTEL">호텔</option><option value="RESTAURANT">음식점</option><option value="ATTRACTION">주변 볼거리</option></select><input className="w-full border border-border rounded px-3 py-2" placeholder="질문" value={draft.question} onChange={(event) => setDraft({ ...draft, question: event.target.value })} /><textarea className="w-full border border-border rounded px-3 py-2" rows={5} placeholder="답변" value={draft.answer} onChange={(event) => setDraft({ ...draft, answer: event.target.value })} /><div className="flex justify-end gap-2"><button type="button" onClick={() => setModalOpen(false)} className="border border-border rounded px-4 py-2">취소</button><button type="button" disabled={saving} onClick={() => void save()} className="bg-primary text-white rounded px-4 py-2">저장</button></div></div></div>}
    <ConfirmModal open={!!deleteTarget} title="질문 삭제" message={`"${deleteTarget?.question}" 질문을 삭제하시겠습니까?`} onConfirm={() => void remove()} onCancel={() => setDeleteTarget(null)} />
    <Toast message={message} visible={visible} />
  </>;
}
