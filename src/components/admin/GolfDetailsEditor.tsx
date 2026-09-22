"use client";

import { useState, useEffect, useCallback } from "react";
import { adminFetchJson } from "@/lib/admin-fetch";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Item {
  id: string;
  type: string;
  value: string;
  value_jp?: string | null;
  legacy_id?: string;
  is_visible?: boolean;
}

interface Section {
  id: string;
  key: string;
  title_ko: string;
  emoji?: string | null;
  sort: number;
  is_visible: boolean;
  source?: string;
  source_table?: string;
  source_column?: string;
  legacy_id?: string;
  items: Item[];
}

interface EntityDetailsDocumentV1 {
  version: 1;
  sections: Section[];
}

interface EntityEditorData {
  id: string;
  slug: string;
  display_name: string;
  entity_type: string;
  updated_at: string;
  details_json: EntityDetailsDocumentV1 | null;
}

interface GetResponse {
  success: true;
  data: EntityEditorData;
}

interface RpcResult {
  conflict: boolean;
  id?: string;
  slug?: string;
  updated_at?: string;
  details_json?: EntityDetailsDocumentV1;
  current_updated_at?: string;
}

interface PutResponse {
  success: true;
  data: RpcResult;
}

export interface GolfDetailsEditorProps {
  entityId: string;
  onClose?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function newId(): string {
  return crypto.randomUUID();
}

function emptyDocument(): EntityDetailsDocumentV1 {
  return { version: 1, sections: [] };
}

function emptySection(): Section {
  return {
    id: newId(),
    key: "",
    title_ko: "",
    emoji: null,
    sort: 0,
    is_visible: true,
    items: [],
  };
}

function emptyItem(): Item {
  return {
    id: newId(),
    type: "text",
    value: "",
    value_jp: null,
    is_visible: true,
  };
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function countDifferences(
  original: EntityDetailsDocumentV1,
  current: EntityDetailsDocumentV1
): number {
  let count = 0;
  const origMap = new Map(original.sections.map((s) => [s.id, s]));

  for (const sec of current.sections) {
    const origSec = origMap.get(sec.id);
    if (!origSec) {
      count += 1 + sec.items.length;
      continue;
    }
    if (
      sec.title_ko !== origSec.title_ko ||
      sec.emoji !== origSec.emoji ||
      sec.sort !== origSec.sort ||
      sec.is_visible !== origSec.is_visible ||
      sec.key !== origSec.key
    ) {
      count++;
    }
    const origItemMap = new Map(origSec.items.map((i) => [i.id, i]));
    for (const item of sec.items) {
      const origItem = origItemMap.get(item.id);
      if (!origItem) {
        count++;
        continue;
      }
      if (
        item.value !== origItem.value ||
        item.value_jp !== origItem.value_jp ||
        item.is_visible !== origItem.is_visible
      ) {
        count++;
      }
    }
    for (const origItem of origSec.items) {
      if (!sec.items.find((i) => i.id === origItem.id)) {
        count++;
      }
    }
  }
  for (const origSec of original.sections) {
    if (!current.sections.find((s) => s.id === origSec.id)) {
      count += 1 + origSec.items.length;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GolfDetailsEditor({ entityId, onClose }: GolfDetailsEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [entityInfo, setEntityInfo] = useState<Omit<EntityEditorData, "details_json"> | null>(null);
  const [doc, setDoc] = useState<EntityDetailsDocumentV1>(emptyDocument());
  const [serverDoc, setServerDoc] = useState<EntityDetailsDocumentV1>(emptyDocument());
  const [updatedAt, setUpdatedAt] = useState<string>("");

  const dirtyCount = countDifferences(serverDoc, doc);

  const loadEntity = useCallback(async (opts?: { preserveConflict?: boolean }) => {
    setLoading(true);
    setError(null);
    if (!opts?.preserveConflict) {
      setConflictWarning(false);
    }
    setSuccessMessage(false);
    try {
      const res = await adminFetchJson<GetResponse>(
        `/api/admin/entity-editor?entity_id=${entityId}`
      );
      const data = res.data;
      setEntityInfo({
        id: data.id,
        slug: data.slug,
        display_name: data.display_name,
        entity_type: data.entity_type,
        updated_at: data.updated_at,
      });
      const loaded = data.details_json ?? emptyDocument();
      setDoc(deepClone(loaded));
      setServerDoc(deepClone(loaded));
      setUpdatedAt(data.updated_at);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    void loadEntity();
  }, [loadEntity]);

  // Section handlers
  const updateSection = (sectionId: string, patch: Partial<Section>) => {
    setDoc((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, ...patch } : s
      ),
    }));
  };

  const removeSection = (sectionId: string) => {
    setDoc((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }));
  };

  const addSection = () => {
    const sec = emptySection();
    sec.sort = doc.sections.length;
    setDoc((prev) => ({
      ...prev,
      sections: [...prev.sections, sec],
    }));
  };

  // Item handlers
  const updateItem = (sectionId: string, itemId: string, patch: Partial<Item>) => {
    setDoc((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              items: s.items.map((i) =>
                i.id === itemId ? { ...i, ...patch } : i
              ),
            }
          : s
      ),
    }));
  };

  const removeItem = (sectionId: string, itemId: string) => {
    setDoc((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? { ...s, items: s.items.filter((i) => i.id !== itemId) }
          : s
      ),
    }));
  };

  const addItem = (sectionId: string) => {
    setDoc((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? { ...s, items: [...s.items, emptyItem()] }
          : s
      ),
    }));
  };

  // Save
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setConflictWarning(false);
    setSuccessMessage(false);
    try {
      const res = await adminFetchJson<PutResponse>("/api/admin/entity-editor", {
        method: "PUT",
        body: JSON.stringify({
          entity_id: entityId,
          expected_updated_at: updatedAt,
          details_json: doc,
        }),
      });
      const result = res.data;
      if (result.conflict) {
        setConflictWarning(true);
        // Reload server data — preserve conflict warning so user sees it
        await loadEntity({ preserveConflict: true });
        return;
      }
      // Success
      if (result.updated_at) {
        setUpdatedAt(result.updated_at);
      }
      if (result.details_json) {
        const fresh = deepClone(result.details_json);
        setDoc(fresh);
        setServerDoc(fresh);
      } else {
        setServerDoc(deepClone(doc));
      }
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="p-6 text-center text-muted">로딩 중...</div>
    );
  }

  if (error && !entityInfo) {
    return (
      <div className="p-6">
        <div className="text-red-600 mb-4">{error}</div>
        <button onClick={loadEntity} className="text-primary underline">
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h2 className="text-[16px] font-bold text-text">
            JSON 편집 — {entityInfo?.display_name ?? entityId}
          </h2>
          <p className="text-[12px] text-muted">
            slug: {entityInfo?.slug} | type: {entityInfo?.entity_type}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted hover:text-text text-[18px] min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="닫기"
          >
            ✕
          </button>
        )}
      </div>

      {/* Conflict Warning */}
      {conflictWarning && (
        <div className="mx-4 mt-3 px-4 py-3 bg-yellow-50 border border-yellow-300 rounded text-[14px] text-yellow-800">
          ⚠️ 다른 사용자가 이 데이터를 수정했습니다. 현재 서버 데이터를 새로고침합니다.
        </div>
      )}

      {/* Success */}
      {successMessage && (
        <div className="mx-4 mt-3 px-4 py-3 bg-green-50 border border-green-300 rounded text-[14px] text-green-800">
          ✅ 저장되었습니다.
        </div>
      )}

      {/* Error */}
      {error && entityInfo && (
        <div className="mx-4 mt-3 px-4 py-3 bg-red-50 border border-red-300 rounded text-[14px] text-red-800">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button
          onClick={handleSave}
          disabled={saving || dirtyCount === 0}
          className="bg-primary text-white px-4 py-2 rounded text-[14px] font-medium disabled:opacity-50 min-h-[44px]"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        {dirtyCount > 0 && (
          <span className="text-[13px] text-orange-600">
            저장되지 않은 변경사항 {dirtyCount}건
          </span>
        )}
        <button
          onClick={addSection}
          className="ml-auto border border-border px-3 py-2 rounded text-[13px] text-text hover:bg-surface min-h-[44px]"
        >
          + 섹션 추가
        </button>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {doc.sections.length === 0 && (
          <p className="text-muted text-[14px]">섹션이 없습니다. &quot;+ 섹션 추가&quot; 버튼을 눌러 시작하세요.</p>
        )}
        {doc.sections.map((section, idx) => (
          <div
            key={section.id}
            className="border border-border rounded-lg p-4 bg-surface"
          >
            {/* Section header */}
            <div className="flex items-start gap-2 mb-3">
              <span className="text-[12px] text-muted mt-2 w-[24px] text-center shrink-0">
                #{idx}
              </span>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-[auto_1fr_80px_80px_auto] gap-2 items-center">
                <input
                  type="text"
                  value={section.emoji ?? ""}
                  onChange={(e) =>
                    updateSection(section.id, { emoji: e.target.value || null })
                  }
                  placeholder="😀"
                  className="border border-border rounded px-2 py-1 text-[14px] w-[48px] text-center"
                />
                <input
                  type="text"
                  value={section.title_ko}
                  onChange={(e) =>
                    updateSection(section.id, { title_ko: e.target.value })
                  }
                  placeholder="섹션 제목"
                  className="border border-border rounded px-2 py-1 text-[14px]"
                />
                <input
                  type="number"
                  value={section.sort}
                  onChange={(e) =>
                    updateSection(section.id, { sort: Number(e.target.value) })
                  }
                  className="border border-border rounded px-2 py-1 text-[14px] w-[80px]"
                  title="sort"
                />
                <input
                  type="text"
                  value={section.key}
                  onChange={(e) =>
                    updateSection(section.id, { key: e.target.value })
                  }
                  placeholder="key"
                  className="border border-border rounded px-2 py-1 text-[14px] w-[80px]"
                  title="key"
                />
                <label className="flex items-center gap-1 text-[13px] text-text cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={section.is_visible}
                    onChange={(e) =>
                      updateSection(section.id, {
                        is_visible: e.target.checked,
                      })
                    }
                  />
                  표시
                </label>
              </div>
              <button
                onClick={() => removeSection(section.id)}
                className="text-red-500 hover:text-red-700 text-[13px] min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
                title="섹션 삭제"
              >
                삭제
              </button>
            </div>

            {/* Items */}
            <div className="ml-[32px] space-y-2">
              {section.items.map((item) => (
                <div key={item.id} className="flex items-start gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted shrink-0">
                        {item.type}
                      </span>
                      <label className="flex items-center gap-1 text-[12px] text-text cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={item.is_visible !== false}
                          onChange={(e) =>
                            updateItem(section.id, item.id, {
                              is_visible: e.target.checked,
                            })
                          }
                        />
                        표시
                      </label>
                    </div>
                    <textarea
                      value={item.value}
                      onChange={(e) =>
                        updateItem(section.id, item.id, {
                          value: e.target.value,
                        })
                      }
                      placeholder="값 (한국어)"
                      rows={2}
                      className="w-full border border-border rounded px-2 py-1 text-[13px] resize-y"
                    />
                    <textarea
                      value={item.value_jp ?? ""}
                      onChange={(e) =>
                        updateItem(section.id, item.id, {
                          value_jp: e.target.value || null,
                        })
                      }
                      placeholder="値 (日本語) — 선택사항"
                      rows={2}
                      className="w-full border border-border rounded px-2 py-1 text-[13px] resize-y"
                    />
                  </div>
                  <button
                    onClick={() => removeItem(section.id, item.id)}
                    className="text-red-400 hover:text-red-600 text-[12px] min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
                    title="항목 삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => addItem(section.id)}
                className="text-primary text-[13px] hover:underline min-h-[44px] flex items-center"
              >
                + 항목 추가
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
