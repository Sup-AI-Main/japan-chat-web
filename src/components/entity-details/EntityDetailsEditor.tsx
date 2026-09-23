/**
 * Shared EntityDetailsEditor — replaces GolfDetailsEditor.
 *
 * Generic entity details editor that works for Golf/Hotel/Restaurant/Attraction.
 * All edits are local draft — no API mutation until "수정완료".
 *
 * Features:
 * - canonical load from /api/admin/entity-editor
 * - local draft state with dirty count
 * - section/item CRUD (all draft-only)
 * - section/item label editing
 * - typed item values
 * - stable id/key generation
 * - single save with pipeline
 * - conflict detection + canonical reload
 * - entity type mismatch guard
 * - unsaved-close protection
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { adminFetchJson, StaleVersionError } from "@/lib/admin-fetch";
import { normalizeEntityDetails } from "@/lib/entity-details/normalize";
import { countDifferences } from "@/lib/entity-details/diff";
import type {
  CmsEntityType,
  EntityDetailsDocumentV1,
  EntityDetailsSection,
  EntityDetailsItem,
  EntityEditorData,
  EntityEditorGetResponse,
  EntityEditorPutResponse,
} from "@/lib/entity-details/types";
import type { SaveStep, SaveStepStatus } from "./EntitySaveProgress";
import { EntityDetailsEditorModal } from "./EntityDetailsEditorModal";
import { EntityDetailsSectionEditor } from "./EntityDetailsSectionEditor";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EntityDetailsEditorProps {
  entityId: string;
  entityType: CmsEntityType;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function newId(): string {
  return crypto.randomUUID();
}

function makeStableKey(label: string, prefix: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return base ? `${prefix}_${base}` : `${prefix}_${newId().slice(0, 8)}`;
}

function emptyDocument(): EntityDetailsDocumentV1 {
  return { version: 1, sections: [] };
}

function emptySection(sort: number): EntityDetailsSection {
  return {
    id: newId(),
    key: "",
    title_ko: "",
    title_jp: null,
    emoji: null,
    sort,
    is_visible: true,
    items: [],
  };
}

function emptyItem(sort: number): EntityDetailsItem {
  return {
    id: newId(),
    key: "",
    label_ko: "",
    label_jp: null,
    type: "text",
    value: "",
    value_jp: null,
    sort,
    is_visible: true,
  };
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

const INITIAL_STEPS: SaveStep[] = [
  { id: "validate", label: "입력값 검증", status: "pending" },
  { id: "prepare", label: "변경사항 준비", status: "pending" },
  { id: "save", label: "서버 저장", status: "pending" },
  { id: "conflict", label: "충돌 확인", status: "pending" },
  { id: "canonical", label: "저장 결과 재확인", status: "pending" },
  { id: "revalidate", label: "공개 페이지 갱신", status: "pending" },
  { id: "done", label: "완료", status: "pending" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EntityDetailsEditor({
  entityId,
  entityType,
  open,
  onClose,
  onSaved,
}: EntityDetailsEditorProps) {
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState(false);
  const [revalidationWarning, setRevalidationWarning] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [entityInfo, setEntityInfo] = useState<Omit<
    EntityEditorData,
    "details_json"
  > | null>(null);
  const [doc, setDoc] = useState<EntityDetailsDocumentV1>(emptyDocument());
  const [serverDoc, setServerDoc] =
    useState<EntityDetailsDocumentV1>(emptyDocument());
  const [updatedAt, setUpdatedAt] = useState("");
  const [saveSteps, setSaveSteps] = useState<SaveStep[]>(INITIAL_STEPS);
  const [showPipeline, setShowPipeline] = useState(false);

  const dirtyCount = countDifferences(serverDoc, doc);

  // Load entity
  const loadEntity = useCallback(
    async (opts?: { preserveConflict?: boolean }) => {
      setLoading(true);
      setError(null);
      if (!opts?.preserveConflict) setConflictWarning(false);
      setSuccessMessage(false);
      setShowPipeline(false);
      try {
        const res = await adminFetchJson<EntityEditorGetResponse>(
          `/api/admin/entity-editor?entity_id=${entityId}`
        );
        const data = res.data;

        // Entity type mismatch guard
        if (
          data.entity_type &&
          data.entity_type.toUpperCase() !== entityType
        ) {
          setError(
            `엔티티 타입 불일치: 기대=${entityType}, 실제=${data.entity_type}`
          );
          setLoading(false);
          return;
        }

        setEntityInfo({
          id: data.id,
          slug: data.slug,
          display_name: data.display_name,
          entity_type: data.entity_type,
          area: data.area,
          updated_at: data.updated_at,
        });
        const loaded = normalizeEntityDetails(
          data.details_json ?? emptyDocument()
        );
        setDoc(deepClone(loaded));
        setServerDoc(deepClone(loaded));
        setUpdatedAt(data.updated_at);
      } catch (err) {
        setError(err instanceof Error ? err.message : "로드 실패");
      } finally {
        setLoading(false);
      }
    },
    [entityId, entityType]
  );

  // Track whether we've loaded for the current open session (ref avoids setState in effect)
  const loadedRef = useRef(false);

  useEffect(() => {
    if (open && !loadedRef.current) {
      loadedRef.current = true;
      void loadEntity();
    }
    if (!open) {
      loadedRef.current = false;
    }
  }, [open, loadEntity]);

  // Section handlers
  const updateSection = (
    sectionId: string,
    patch: Partial<EntityDetailsSection>
  ) => {
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
    const sec = emptySection(doc.sections.length);
    sec.key = makeStableKey("", "section");
    setDoc((prev) => ({
      ...prev,
      sections: [...prev.sections, sec],
    }));
  };

  const moveSection = (sectionId: string, direction: -1 | 1) => {
    setDoc((prev) => {
      const idx = prev.sections.findIndex((s) => s.id === sectionId);
      if (idx < 0) return prev;
      const target = idx + direction;
      if (target < 0 || target >= prev.sections.length) return prev;
      const next = [...prev.sections];
      [next[idx], next[target]] = [next[target], next[idx]];
      // Update sort values
      const updated = next.map((s, i) => ({ ...s, sort: i }));
      return { ...prev, sections: updated };
    });
  };

  // Item handlers
  const updateItem = (
    sectionId: string,
    itemId: string,
    patch: Partial<EntityDetailsItem>
  ) => {
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
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const newItem = emptyItem(s.items.length);
        newItem.key = makeStableKey("", s.key || "item");
        return { ...s, items: [...s.items, newItem] };
      }),
    }));
  };

  // Save
  const updateStep = (stepId: string, status: SaveStepStatus) => {
    setSaveSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, status } : s))
    );
  };

  const handleSave = async () => {
    if (dirtyCount === 0 || saving) return;

    setSaving(true);
    setError(null);
    setConflictWarning(false);
    setRevalidationWarning(false);
    setSuccessMessage(false);
    setShowPipeline(true);
    setSaveSteps(INITIAL_STEPS);

    try {
      // Step 1: Validate
      updateStep("validate", "running");
      // Basic client-side validation
      for (const section of doc.sections) {
        if (!section.title_ko.trim()) {
          throw new Error("섹션 제목은 필수입니다.");
        }
        for (const item of section.items) {
          if (item.type === "url" && typeof item.value === "string" && item.value.trim()) {
            try {
              const url = new URL(item.value);
              if (url.protocol !== "http:" && url.protocol !== "https:") {
                throw new Error("URL은 http/https만 허용됩니다.");
              }
            } catch {
              throw new Error(`잘못된 URL: ${item.value}`);
            }
          }
        }
      }
      updateStep("validate", "success");

      // Step 2: Prepare
      updateStep("prepare", "running");
      // Ensure all sections/keys are set
      const prepared = deepClone(doc);
      for (const section of prepared.sections) {
        if (!section.key) {
          section.key = makeStableKey(section.title_ko, "section");
        }
        for (const item of section.items) {
          if (!item.key) {
            item.key = makeStableKey(
              item.label_ko || "",
              section.key || "item"
            );
          }
        }
      }
      updateStep("prepare", "success");

      // Step 3: Server save
      updateStep("save", "running");
      const res = await adminFetchJson<EntityEditorPutResponse>(
        "/api/admin/entity-editor",
        {
          method: "PUT",
          body: JSON.stringify({
            entity_id: entityId,
            expected_updated_at: updatedAt,
            details_json: prepared,
          }),
        }
      );
      updateStep("save", "success");

      // Step 4: Conflict check (HTTP 409 would have thrown StaleVersionError)
      updateStep("conflict", "running");
      // Reaching here means no conflict — server returned 200 with conflict:false
      updateStep("conflict", "success");

      // Step 5: Canonical re-read
      const result = res.data;
      updateStep("canonical", "running");
      if (result.updated_at) setUpdatedAt(result.updated_at);
      if (result.details_json) {
        const fresh = normalizeEntityDetails(result.details_json);
        setDoc(deepClone(fresh));
        setServerDoc(deepClone(fresh));
      } else {
        setServerDoc(deepClone(prepared));
      }
      updateStep("canonical", "success");

      // Step 6: Revalidation — use truthful server response
      if (result.revalidated === false) {
        updateStep("revalidate", "error");
        updateStep("done", "success");
        setSuccessMessage(true);
        setRevalidationWarning(true);
        onSaved?.();
      } else {
        updateStep("revalidate", "success");
        updateStep("done", "success");
        setSuccessMessage(true);
        onSaved?.();
      }
    } catch (err) {
      // Explicit conflict handling — StaleVersionError from HTTP 409
      if (err instanceof StaleVersionError) {
        updateStep("save", "success");
        updateStep("conflict", "error");
        setConflictWarning(true);
        setSaving(false);
        await loadEntity({ preserveConflict: true });
        return;
      }
      // Mark current running step as error
      const runningStep = saveSteps.find((s) => s.status === "running");
      if (runningStep) updateStep(runningStep.id, "error");
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  // Header
  const headerTitle = `${entityInfo?.display_name ?? entityId} — 세부사항 수정`;

  // Render content
  const content = (
    <>
      {conflictWarning && (
        <div className="mb-4 px-4 py-3 bg-yellow-50 border border-yellow-300 rounded text-[14px] text-yellow-800">
          다른 사용자가 이 데이터를 수정했습니다. 서버 데이터를 새로고침합니다.
        </div>
      )}

      {revalidationWarning && (
        <div className="mb-4 px-4 py-3 bg-orange-50 border border-orange-300 rounded text-[14px] text-orange-800">
          DB 저장은 완료되었으나 공개 페이지 갱신에 실패했습니다. 공개 페이지는 다음 요청 시 자동 갱신됩니다.
        </div>
      )}

      {successMessage && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-300 rounded text-[14px] text-green-800">
          저장되었습니다.
        </div>
      )}

      {/* Dirty count */}
      {dirtyCount > 0 && (
        <div className="mb-3 text-[13px] text-orange-600">
          저장되지 않은 변경사항 {dirtyCount}건
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {doc.sections.length === 0 && (
          <p className="text-muted text-[14px]">
            섹션이 없습니다. &quot;+ 섹션 추가&quot; 버튼을 눌러 시작하세요.
          </p>
        )}
        {doc.sections.map((section, idx) => (
          <EntityDetailsSectionEditor
            key={section.id}
            section={section}
            index={idx}
            onUpdate={(patch) => updateSection(section.id, patch)}
            onRemove={() => removeSection(section.id)}
            onMoveUp={() => moveSection(section.id, -1)}
            onMoveDown={() => moveSection(section.id, 1)}
            onAddItem={() => addItem(section.id)}
            onUpdateItem={(itemId, patch) =>
              updateItem(section.id, itemId, patch)
            }
            onRemoveItem={(itemId) => removeItem(section.id, itemId)}
            disabled={saving}
          />
        ))}
      </div>

      {/* Add section button */}
      <button
        onClick={addSection}
        disabled={saving}
        className="mt-4 border border-border px-4 py-2 rounded text-[13px] text-text hover:bg-surface min-h-[44px]"
      >
        + 섹션 추가
      </button>
    </>
  );

  // Loading state
  if (loading && open) {
    return (
      <EntityDetailsEditorModal
        open={open}
        title="로딩 중..."
        onClose={onClose}
        onSave={() => {}}
        saving={false}
        isDirty={false}
        error={null}
        saveSteps={[]}
        showPipeline={false}
      >
        <div className="p-6 text-center text-muted">로딩 중...</div>
      </EntityDetailsEditorModal>
    );
  }

  // Error state (no entity loaded)
  if (error && !entityInfo) {
    return (
      <EntityDetailsEditorModal
        open={open}
        title="오류"
        onClose={onClose}
        onSave={() => {}}
        saving={false}
        isDirty={false}
        error={error}
        saveSteps={[]}
        showPipeline={false}
      >
        <button
          onClick={() => void loadEntity()}
          className="text-primary underline"
        >
          다시 시도
        </button>
      </EntityDetailsEditorModal>
    );
  }

  return (
    <EntityDetailsEditorModal
      open={open}
      title={headerTitle}
      onClose={onClose}
      onSave={handleSave}
      saving={saving}
      isDirty={dirtyCount > 0}
      error={error}
      saveSteps={saveSteps}
      showPipeline={showPipeline}
    >
      {content}
    </EntityDetailsEditorModal>
  );
}
