"use client";

import { useEffect, useState } from "react";
import type { ContentSection } from "@/lib/types";
import { useAdmin } from "@/hooks/use-admin";
import { useServerList } from "@/hooks/use-server-list";
import { adminFetchJson } from "@/lib/admin-fetch";
import { useToast } from "@/components/Toast";
import { ModalShell } from "./ModalShell";
import { ConfirmModal } from "./ConfirmModal";

interface ContentSectionsRendererProps {
  parentType: string;
  parentId: string;
  initialSections: ContentSection[];
}

type Draft = Pick<ContentSection, "title" | "content" | "emoji" | "sort" | "is_visible">;
const EMPTY_DRAFT: Draft = { title: "", content: "", emoji: "", sort: 999, is_visible: "TRUE" };

export function ContentSectionsRenderer({ parentType, parentId, initialSections }: ContentSectionsRendererProps) {
  const isAdmin = useAdmin();
  const { showToast } = useToast();
  const [sections, setSections] = useServerList(initialSections);
  const [editing, setEditing] = useState<ContentSection | null | undefined>(undefined);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [deleteTarget, setDeleteTarget] = useState<ContentSection | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    void adminFetchJson<{ data: { sections: ContentSection[] } }>(
      `/api/admin/content-sections?parent_type=${encodeURIComponent(parentType)}&parent_id=${encodeURIComponent(parentId)}`,
      { cache: "no-store" }
    ).then((response) => { if (active) setSections(response.data.sections); }).catch(() => {});
    return () => { active = false; };
  }, [isAdmin, parentType, parentId, setSections]);

  async function reload() {
    const response = await adminFetchJson<{ data: { sections: ContentSection[] } }>(
      `/api/admin/content-sections?parent_type=${encodeURIComponent(parentType)}&parent_id=${encodeURIComponent(parentId)}`,
      { cache: "no-store" }
    );
    setSections(response.data.sections);
    showToast("DB 동기화 완료");
  }

  function openEditor(section: ContentSection | null) {
    setEditing(section);
    setDraft(section ? { title: section.title, content: section.content, emoji: section.emoji, sort: section.sort, is_visible: section.is_visible } : EMPTY_DRAFT);
  }

  async function save() {
    if (!draft.title.trim()) return;
    setSaving(true);
    try {
      await adminFetchJson("/api/admin/content-sections", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({
          ...draft, sort: String(draft.sort), parent_type: parentType, parent_entity_id: parentId,
          ...(editing ? { id: editing.id, updated_at: editing.updated_at } : {}),
        }),
      });
      await reload();
      setEditing(undefined);
    } catch { /* The shared error dialog shows the server code and explanation. */ }
    finally { setSaving(false); }
  }

  async function remove(): Promise<boolean> {
    if (!deleteTarget) return false;
    setSaving(true);
    try {
      await adminFetchJson(`/api/admin/content-sections?id=${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
      await reload();
      setDeleteTarget(null);
      return true;
    } catch { return false; }
    finally { setSaving(false); }
  }

  const visible = sections.filter((section) => isAdmin || section.is_visible !== "FALSE").sort((a, b) => a.sort - b.sort);
  if (!isAdmin && visible.length === 0) return null;

  return <div className="mt-6">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[16px] font-bold text-text">추가 안내</h2>
      {isAdmin && <button type="button" onClick={() => openEditor(null)} className="rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary">+ 안내 추가</button>}
    </div>
    <div className="space-y-4">
      {visible.map((section) => <div key={section.id} className={`rounded-[12px] border border-border bg-surface p-4 ${section.is_visible === "FALSE" ? "opacity-55" : ""}`}>
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="text-[15px] font-bold text-text">{section.emoji ? `${section.emoji} ` : ""}{section.title}</h3>
          {isAdmin && <div className="flex shrink-0 gap-2 text-xs">
            <button type="button" onClick={() => openEditor(section)} className="text-primary">수정</button>
            <button type="button" onClick={() => setDeleteTarget(section)} className="text-danger">삭제</button>
          </div>}
        </div>
        {section.content && <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-text">{section.content}</p>}
      </div>)}
    </div>
    <ModalShell open={editing !== undefined} title={editing ? "추가 안내 수정" : "추가 안내 추가"} onClose={() => setEditing(undefined)} maxWidth="520px" footer={<>
      <button type="button" onClick={() => setEditing(undefined)} disabled={saving} className="rounded-lg border border-border px-4 py-2 text-sm">취소</button>
      <button type="button" onClick={() => void save()} disabled={saving || !draft.title.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? "저장 중…" : "저장"}</button>
    </>}>
      <div className="space-y-4 text-sm">
        <label className="block">제목<input value={draft.title} onChange={(e) => setDraft((old) => ({ ...old, title: e.target.value }))} className="mt-1 w-full rounded-lg border border-border p-2" /></label>
        <label className="block">내용<textarea value={draft.content} onChange={(e) => setDraft((old) => ({ ...old, content: e.target.value }))} rows={6} className="mt-1 w-full rounded-lg border border-border p-2" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label>아이콘<input value={draft.emoji} onChange={(e) => setDraft((old) => ({ ...old, emoji: e.target.value }))} className="mt-1 w-full rounded-lg border border-border p-2" /></label>
          <label>정렬<input type="number" value={draft.sort} onChange={(e) => setDraft((old) => ({ ...old, sort: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-border p-2" /></label>
        </div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={draft.is_visible !== "FALSE"} onChange={(e) => setDraft((old) => ({ ...old, is_visible: e.target.checked ? "TRUE" : "FALSE" }))} />공개 표시</label>
      </div>
    </ModalShell>
    <ConfirmModal open={deleteTarget !== null} title="추가 안내 삭제" message={`“${deleteTarget?.title ?? ""}” 항목을 삭제하시겠습니까?`} onConfirm={remove} onCancel={() => setDeleteTarget(null)} loading={saving} />
  </div>;
}
