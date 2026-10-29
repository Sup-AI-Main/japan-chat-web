"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/hooks/use-admin";
import { adminFetchJson } from "@/lib/admin-fetch";
import { ConfirmModal } from "@/components/inline-cms";
import { useToast } from "@/components/Toast";
import { getCategoryEmoji } from "@/lib/display";
import type { AdminOption, FaqItem } from "@/lib/types";

interface FaqOptions {
  areas: AdminOption[];
  categories: AdminOption[];
  entities: { slug: string; name: string }[];
}

interface FaqDraft {
  area: string;
  category: string;
  related_id: string;
  question: string;
  answer: string;
}

const emptyOptions: FaqOptions = { areas: [], categories: [], entities: [] };

export default function AreaFaqClient({ area, category, initialFaqs }: { area: string; category?: string; initialFaqs: FaqItem[] }) {
  const router = useRouter();
  const [faqs, setFaqs] = useState(initialFaqs);
  const [target, setTarget] = useState<FaqItem | null>(null);
  const [draft, setDraft] = useState<FaqDraft>({ area, category: category || "", related_id: "", question: "", answer: "" });
  const [options, setOptions] = useState<FaqOptions>(emptyOptions);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FaqItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const isAdmin = useAdmin();
  const { showToast } = useToast();

  useEffect(() => {
    if (!modalOpen) return;
    let cancelled = false;
    let choosingDefaultCategory = false;
    const params = new URLSearchParams({ options: "1", area: draft.area, category: draft.category });
    void adminFetchJson<{ success: true; data: FaqOptions }>(`/api/admin/faq?${params}`, { cache: "no-store" })
      .then(({ data }) => {
        if (cancelled) return;
        setOptions(data);
        if (!draft.category && data.categories.length > 0) {
          choosingDefaultCategory = true;
          setOptionsLoading(true);
          setDraft((current) => ({ ...current, category: data.categories[0].code }));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) showToast(error instanceof Error ? error.message : "선택 항목을 불러오지 못했습니다.");
      })
      .finally(() => { if (!cancelled && !choosingDefaultCategory) setOptionsLoading(false); });
    return () => { cancelled = true; };
  }, [modalOpen, draft.area, draft.category, showToast]);

  function openAdd() {
    setTarget(null);
    setOptions(emptyOptions);
    setOptionsLoading(true);
    setDraft({ area, category: category || "", related_id: "", question: "", answer: "" });
    setModalOpen(true);
  }

  function openEdit(faq: FaqItem) {
    setTarget(faq);
    setOptions(emptyOptions);
    setOptionsLoading(true);
    setDraft({ area: faq.area, category: faq.category, related_id: faq.question_scope === "SPECIFIC" ? faq.related_id : "", question: faq.question, answer: faq.answer });
    setModalOpen(true);
  }

  async function readSavedFaqs(selectedArea: string, selectedCategory?: string): Promise<FaqItem[]> {
    const params = new URLSearchParams({ area: selectedArea });
    if (selectedCategory) params.set("category", selectedCategory);
    const result = await adminFetchJson<{ success: true; data: { faqs: FaqItem[] } }>(`/api/admin/faq?${params}`, { cache: "no-store" });
    return result.data.faqs;
  }

  async function save() {
    if (!draft.question.trim() || !draft.answer.trim()) return showToast("질문과 답변을 모두 입력하세요.");
    if (!options.areas.some((item) => item.code === draft.area) || !options.categories.some((item) => item.code === draft.category)) return showToast("지역과 카테고리를 선택하세요.");
    if (draft.related_id && !options.entities.some((item) => item.slug === draft.related_id)) return showToast("개별 장소를 다시 선택하세요.");
    setSaving(true);
    try {
      const payload = {
        ...(target ? { id: target.id } : {}),
        area: draft.area,
        category: draft.category,
        question_scope: draft.related_id ? "SPECIFIC" : "AREA",
        related_type: draft.related_id ? draft.category : "",
        related_id: draft.related_id,
        question: draft.question.trim(),
        answer: draft.answer.trim(),
        active: "TRUE",
      };
      const result = await adminFetchJson<{ success: true; data: { id?: string } }>("/api/admin/faq", {
        method: target ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      const savedId = result.data?.id || target?.id;
      if (!savedId) throw new Error("저장된 질문 ID를 확인할 수 없습니다.");
      const savedFaqs = await readSavedFaqs(draft.area, draft.category);
      const saved = savedFaqs.find((faq) => faq.id === savedId);
      if (!saved || saved.question !== payload.question || saved.answer !== payload.answer || saved.question_scope !== payload.question_scope || saved.related_id !== payload.related_id) {
        throw new Error("DB에서 저장 결과를 확인하지 못했습니다. 다시 불러와 확인해 주세요.");
      }
      if (draft.area === area && (!category || draft.category === category)) {
        const visibleFaqs = category ? savedFaqs : await readSavedFaqs(draft.area);
        setFaqs(visibleFaqs.filter((faq) => faq.area === area && faq.question_scope === "AREA" && (!category || faq.category === category)));
      }
      setTarget(null);
      setModalOpen(false);
      showToast("질문이 저장되었습니다.");
      const selectedCategory = options.categories.find((item) => item.code === draft.category);
      const categorySegment = (selectedCategory?.template_type || draft.category).toLowerCase();
      const destination = draft.related_id
        ? `/${draft.area.toLowerCase()}/${categorySegment}/${draft.related_id}`
        : `/${draft.area.toLowerCase()}/${categorySegment}`;
      const currentPath = window.location.pathname.replace(/\/$/, "");
      if (destination !== currentPath) router.push(destination);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    try {
      await adminFetchJson("/api/admin/faq", { method: "DELETE", body: JSON.stringify({ id: deleteTarget.id }) });
      const remaining = await readSavedFaqs(deleteTarget.area, deleteTarget.category);
      if (remaining.some((faq) => faq.id === deleteTarget.id)) throw new Error("DB에서 삭제 결과를 확인하지 못했습니다.");
      setFaqs((current) => current.filter((faq) => faq.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast("질문이 삭제되었습니다.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    }
  }

  return <>
    <section className="mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-[18px] font-bold text-text">❓ {category ? "공통 질문" : "자주 찾는 질문"}</h2>
        {isAdmin && <button type="button" onClick={openAdd} className="bg-primary text-white rounded px-3 py-2 text-[13px] shrink-0">＋ 질문 추가</button>}
      </div>
      {faqs.length > 0 && <div className="space-y-2">{faqs.map((faq) => <details key={faq.id} className="bg-surface border border-border rounded-[8px] group"><summary className="p-3 text-[15px] text-text cursor-pointer list-none flex items-center justify-between gap-2"><span>{getCategoryEmoji(faq.category)} {faq.question}</span><span className="flex gap-2 shrink-0">{isAdmin && <button type="button" onClick={(event) => { event.preventDefault(); openEdit(faq); }} className="text-primary">수정</button>}{isAdmin && <button type="button" onClick={(event) => { event.preventDefault(); setDeleteTarget(faq); }} className="text-danger">삭제</button>}<span>▼</span></span></summary><div className="px-3 pb-3 pt-2 text-[15px] text-text leading-[1.6] border-t border-border whitespace-pre-wrap">{faq.answer}</div></details>)}</div>}
      {faqs.length === 0 && <p className="text-[14px] text-muted">등록된 공통 질문이 없습니다.</p>}
    </section>
    {isAdmin && modalOpen && <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40"><div className="bg-surface rounded-[16px] p-6 w-full max-w-[640px] max-h-[90dvh] overflow-y-auto mx-4 space-y-3"><h2 className="font-bold">{target ? "질문 수정" : "질문 추가"}</h2>
      <label className="block text-[14px]">지역<select className="block w-full border border-border rounded px-3 py-2 mt-1" value={draft.area} onChange={(event) => { setOptionsLoading(true); setDraft({ ...draft, area: event.target.value, related_id: "" }); }}>{options.areas.map((item) => <option key={item.id} value={item.code}>{item.label}</option>)}</select></label>
      <label className="block text-[14px]">카테고리<select className="block w-full border border-border rounded px-3 py-2 mt-1" value={draft.category} onChange={(event) => { setOptionsLoading(true); setDraft({ ...draft, category: event.target.value, related_id: "" }); }}>{options.categories.map((item) => <option key={item.id} value={item.code}>{item.label}</option>)}</select></label>
      <label className="block text-[14px]">적용 대상<select className="block w-full border border-border rounded px-3 py-2 mt-1" value={draft.related_id} onChange={(event) => setDraft({ ...draft, related_id: event.target.value })}><option value="">공통 (카테고리 전체)</option>{options.entities.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
      {optionsLoading && <p className="text-[13px] text-muted">선택 항목을 불러오는 중입니다.</p>}
      <input className="w-full border border-border rounded px-3 py-2" placeholder="질문" value={draft.question} onChange={(event) => setDraft({ ...draft, question: event.target.value })} />
      <textarea className="w-full border border-border rounded px-3 py-2" rows={5} placeholder="답변" value={draft.answer} onChange={(event) => setDraft({ ...draft, answer: event.target.value })} />
      <div className="flex justify-end gap-2"><button type="button" onClick={() => setModalOpen(false)} className="border border-border rounded px-4 py-2">취소</button><button type="button" disabled={saving || optionsLoading} onClick={() => void save()} className="bg-primary text-white rounded px-4 py-2 disabled:opacity-50">저장</button></div>
    </div></div>}
    <ConfirmModal open={!!deleteTarget} title="질문 삭제" message={`"${deleteTarget?.question}" 질문을 삭제하시겠습니까?`} onConfirm={() => void remove()} onCancel={() => setDeleteTarget(null)} />
  </>;
}
