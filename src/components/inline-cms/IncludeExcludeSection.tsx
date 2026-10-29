"use client";

import { useEffect, useState } from "react";
import type { IncludeExclude } from "@/lib/types";
import { useAdmin } from "@/hooks/use-admin";
import { useServerList } from "@/hooks/use-server-list";
import { adminFetchJson } from "@/lib/admin-fetch";
import { useToast } from "@/components/Toast";
import { ModalShell } from "./ModalShell";
import { ConfirmModal } from "./ConfirmModal";

interface IncludeExcludeSectionProps {
  parentType: "HOTEL" | "GOLF" | "RESTAURANT";
  parentId: string;
  initialItems?: IncludeExclude[];
}

type Draft = Pick<IncludeExclude, "type" | "text_kr" | "text_jp" | "sort" | "is_visible">;
const EMPTY_DRAFT: Draft = { type: "INCLUDED", text_kr: "", text_jp: "", sort: 999, is_visible: "TRUE" };
const EMPTY_ITEMS: IncludeExclude[] = [];

export function IncludeExcludeSection({ parentType, parentId, initialItems }: IncludeExcludeSectionProps) {
  const isAdmin = useAdmin();
  const { showToast } = useToast();
  const [items, setItems] = useServerList(initialItems ?? EMPTY_ITEMS);
  const [editing, setEditing] = useState<IncludeExclude | null | undefined>(undefined);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [deleteTarget, setDeleteTarget] = useState<IncludeExclude | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    void adminFetchJson<{ data: { items: IncludeExclude[] } }>(
      `/api/admin/includes?parent_type=${encodeURIComponent(parentType)}&parent_id=${encodeURIComponent(parentId)}`,
      { cache: "no-store" }
    ).then((response) => { if (active) setItems(response.data.items); }).catch(() => {});
    return () => { active = false; };
  }, [isAdmin, parentType, parentId, setItems]);

  async function reload() {
    const response = await adminFetchJson<{ data: { items: IncludeExclude[] } }>(
      `/api/admin/includes?parent_type=${encodeURIComponent(parentType)}&parent_id=${encodeURIComponent(parentId)}`,
      { cache: "no-store" }
    );
    setItems(response.data.items);
    showToast("DB 동기화 완료");
  }

  function openEditor(item: IncludeExclude | null) {
    setEditing(item);
    setDraft(item ? { type: item.type, text_kr: item.text_kr, text_jp: item.text_jp, sort: item.sort, is_visible: item.is_visible } : EMPTY_DRAFT);
  }

  async function save() {
    if (!draft.text_kr.trim()) return;
    setSaving(true);
    try {
      await adminFetchJson("/api/admin/includes", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({
          ...draft, sort: String(draft.sort), parent_type: parentType, parent_entity_id: parentId,
          ...(editing ? { id: editing.id, updated_at: editing.updated_at } : {}),
        }),
      });
      await reload();
      setEditing(undefined);
    } catch { /* Shared error dialog handles this request. */ }
    finally { setSaving(false); }
  }

  async function remove(): Promise<boolean> {
    if (!deleteTarget) return false;
    setSaving(true);
    try {
      await adminFetchJson(`/api/admin/includes?id=${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
      await reload();
      setDeleteTarget(null);
      return true;
    } catch { return false; }
    finally { setSaving(false); }
  }

  const included = items.filter((i) => i.type === "INCLUDED" && (isAdmin || i.is_visible === "TRUE"));
  const excluded = items.filter((i) => i.type === "EXCLUDED" && (isAdmin || i.is_visible === "TRUE"));

  const hasIncluded = included.length > 0;
  const hasExcluded = excluded.length > 0;
  if (!isAdmin && !hasIncluded && !hasExcluded) return null;

  return (
    <div className="bg-surface border border-border rounded-[12px] p-4 mb-4">
      {isAdmin && <button type="button" onClick={() => openEditor(null)} className="mb-4 rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary">+ 포함·불포함 항목 추가</button>}
      {/* Included */}
      {hasIncluded && (
        <div className="mb-4">
          <h3 className="text-[15px] font-bold text-text mb-2">포함사항</h3>
          <ul className="space-y-1.5">
            {included.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <span className="text-green-600 text-[14px] mt-0.5">✓</span>
                <div>
                  <span className="text-[15px] text-text">{item.text_kr}</span>
                  {item.text_jp && (
                    <p className="text-[13px] text-muted">{item.text_jp}</p>
                  )}
                </div>
                {isAdmin && <div className="ml-auto flex gap-2 text-xs"><button type="button" onClick={() => openEditor(item)} className="text-primary">수정</button><button type="button" onClick={() => setDeleteTarget(item)} className="text-danger">삭제</button></div>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Excluded */}
      {hasExcluded && (
        <div>
          <h3 className="text-[15px] font-bold text-text mb-2">불포함사항</h3>
          <ul className="space-y-1.5">
            {excluded.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <span className="text-red-500 text-[14px] mt-0.5">✗</span>
                <div>
                  <span className="text-[15px] text-text">{item.text_kr}</span>
                  {item.text_jp && (
                    <p className="text-[13px] text-muted">{item.text_jp}</p>
                  )}
                </div>
                {isAdmin && <div className="ml-auto flex gap-2 text-xs"><button type="button" onClick={() => openEditor(item)} className="text-primary">수정</button><button type="button" onClick={() => setDeleteTarget(item)} className="text-danger">삭제</button></div>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <ModalShell open={editing !== undefined} title={editing ? "포함·불포함 항목 수정" : "포함·불포함 항목 추가"} onClose={() => setEditing(undefined)} maxWidth="520px" footer={<>
        <button type="button" onClick={() => setEditing(undefined)} disabled={saving} className="rounded-lg border border-border px-4 py-2 text-sm">취소</button>
        <button type="button" onClick={() => void save()} disabled={saving || !draft.text_kr.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? "저장 중…" : "저장"}</button>
      </>}>
        <div className="space-y-4 text-sm">
          <label className="block">구분<select value={draft.type} onChange={(e) => setDraft((old) => ({ ...old, type: e.target.value }))} className="mt-1 w-full rounded-lg border border-border p-2"><option value="INCLUDED">포함사항</option><option value="EXCLUDED">불포함사항</option></select></label>
          <label className="block">한국어<input value={draft.text_kr} onChange={(e) => setDraft((old) => ({ ...old, text_kr: e.target.value }))} className="mt-1 w-full rounded-lg border border-border p-2" /></label>
          <label className="block">일본어<input value={draft.text_jp} onChange={(e) => setDraft((old) => ({ ...old, text_jp: e.target.value }))} className="mt-1 w-full rounded-lg border border-border p-2" /></label>
          <label className="block">정렬<input type="number" value={draft.sort} onChange={(e) => setDraft((old) => ({ ...old, sort: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-border p-2" /></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={draft.is_visible !== "FALSE"} onChange={(e) => setDraft((old) => ({ ...old, is_visible: e.target.checked ? "TRUE" : "FALSE" }))} />공개 표시</label>
        </div>
      </ModalShell>
      <ConfirmModal open={deleteTarget !== null} title="항목 삭제" message={`“${deleteTarget?.text_kr ?? ""}” 항목을 삭제하시겠습니까?`} onConfirm={remove} onCancel={() => setDeleteTarget(null)} loading={saving} />
    </div>
  );
}
