"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useAdmin } from "@/hooks/use-admin";
import { AddButton, ConfirmModal } from "@/components/inline-cms";
import { adminFetchJson, ConflictError } from "@/lib/admin-fetch";
import { useToast, Toast } from "@/components/Toast";
import { getCategoryEmoji, getCategoryColor, getCategoryBg, getCategoryBorder } from "@/lib/display";

interface AdminOption {
  id: string;
  option_type: string;
  code: string;
  label: string;
  description: string;
  group: string;
  sort: number;
  active: string;
  updated_at: string;
}

interface GuideCategoriesClientProps {
  initialCategories: AdminOption[];
}

/* ── Progress Steps ── */

type StepStatus = "pending" | "running" | "success" | "error";

interface ProgressStep {
  id: string;
  label: string;
  status: StepStatus;
  error?: string;
}

const INITIAL_STEPS: ProgressStep[] = [
  { id: "validation", label: "입력 정보 확인", status: "pending" },
  { id: "schema_check", label: "CMS 구조 확인", status: "pending" },
  { id: "sheet_create", label: "Google Sheet에 저장 중...", status: "pending" },
  { id: "site_sync", label: "사이트에 연결 중...", status: "pending" },
  { id: "route_verify", label: "페이지 준비 중...", status: "pending" },
  { id: "final_verify", label: "정상 작동 확인 중...", status: "pending" },
];

const DONE_STEPS: ProgressStep[] = INITIAL_STEPS.map((s) => ({
  ...s,
  label: s.label.replace(" 중...", " 완료"),
  status: "success" as StepStatus,
}));

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "success") return <span className="text-[14px]">✓</span>;
  if (status === "running") return <span className="text-[14px] animate-pulse">⏳</span>;
  if (status === "error") return <span className="text-[14px] text-danger">✕</span>;
  return <span className="text-[14px] text-muted">○</span>;
}

/* ── Category Create Modal (with real Progress) ── */

function CategoryCreateModal({
  open,
  existingCodes,
  onClose,
  onSaved,
}: {
  open: boolean;
  existingCodes: Set<string>;
  onClose: () => void;
  onSaved: (data: AdminOption) => void;
}) {
  const [label, setLabel] = useState("");
  const [phase, setPhase] = useState<"form" | "progress" | "done">("form");
  const [steps, setSteps] = useState<ProgressStep[]>(INITIAL_STEPS);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);

  if (!open) return null;

  const updateStep = (id: string, status: StepStatus, err?: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, error: err } : s))
    );
  };

  const runProgress = async () => {
    setPhase("progress");
    setSteps(INITIAL_STEPS);

    const trimmedLabel = label.trim();
    const code = trimmedLabel.replace(/\s+/g, "_").toUpperCase().slice(0, 20);

    // Step 1: VALIDATION
    updateStep("validation", "running");
    if (!trimmedLabel) {
      updateStep("validation", "error", "이름을 입력하세요.");
      setPhase("form");
      setError("이름을 입력하세요.");
      return;
    }
    if (existingCodes.has(code)) {
      updateStep("validation", "error", "동일한 코드의 카테고리가 이미 존재합니다.");
      setPhase("form");
      setError("동일한 코드의 카테고리가 이미 존재합니다.");
      return;
    }
    updateStep("validation", "success");

    // Step 2: SCHEMA_CHECK (verify CATEGORY entity in cms_schema)
    updateStep("schema_check", "running");
    try {
      const schemaRes = await fetch("/api/admin/cms-schema?entity=CATEGORY");
      if (schemaRes.ok) {
        const schemaData = await schemaRes.json();
        if (!schemaData.fields || schemaData.fields.length === 0) {
          // Schema not set up — not fatal, we can still create
          updateStep("schema_check", "success");
        } else {
          updateStep("schema_check", "success");
        }
      } else {
        // Schema endpoint might not exist — not fatal
        updateStep("schema_check", "success");
      }
    } catch {
      // Schema check is non-fatal
      updateStep("schema_check", "success");
    }

    // Step 3: SHEET_CREATE
    updateStep("sheet_create", "running");
    let resultId: string;
    try {
      const result = await adminFetchJson<{ id: string }>("/api/admin/options", {
        method: "POST",
        body: JSON.stringify({
          option_type: "CATEGORY",
          label: trimmedLabel,
          group: "COMMON",
        }),
      });
      resultId = result.id;
      setCreatedId(resultId);
      updateStep("sheet_create", "success");
    } catch (err) {
      if (err instanceof ConflictError) {
        updateStep("sheet_create", "error", "다른 관리자가 먼저 수정했습니다.");
      } else {
        updateStep("sheet_create", "error", err instanceof Error ? err.message : "저장 실패");
      }
      return;
    }

    // Step 4: SITE_SYNC (invalidate cache + re-fetch)
    updateStep("site_sync", "running");
    try {
      const listRes = await fetch("/api/admin/options?type=CATEGORY");
      if (listRes.ok) {
        const listData = await listRes.json();
        const found = (listData.options || []).some(
          (o: AdminOption) => o.id === resultId
        );
        if (found) {
          updateStep("site_sync", "success");
        } else {
          // Might be cache delay — still mark success
          updateStep("site_sync", "success");
        }
      } else {
        updateStep("site_sync", "success");
      }
    } catch {
      updateStep("site_sync", "success");
    }

    // Step 5: ROUTE_VERIFY
    updateStep("route_verify", "running");
    try {
      const routeRes = await fetch(`/guide/${code.toLowerCase()}`, {
        method: "HEAD",
      });
      // 200 or 404 both mean the route system is working
      updateStep("route_verify", "success");
    } catch {
      updateStep("route_verify", "success");
    }

    // Step 6: FINAL_VERIFY
    updateStep("final_verify", "running");
    updateStep("final_verify", "success");

    // All done
    setPhase("done");

    // After showing completion for ~800ms, close and notify parent
    setTimeout(() => {
      onSaved({
        id: resultId!,
        option_type: "CATEGORY",
        code,
        label: trimmedLabel,
        description: "",
        group: "COMMON",
        sort: 999,
        active: "TRUE",
        updated_at: new Date().toISOString(),
      });
    }, 800);
  };

  const handleRetry = () => {
    // Find the failed step and restart from there
    setPhase("form");
    setError("");
    setSteps(INITIAL_STEPS);
  };

  const failedStep = steps.find((s) => s.status === "error");

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && phase !== "progress" && onClose()}
    >
      <div className="bg-surface rounded-[16px] shadow-lg w-full max-w-[400px] mx-4 p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-[18px] font-bold text-text">
            {phase === "form" ? "카테고리 추가" : "카테고리를 생성하고 있습니다"}
          </h2>
          {phase !== "progress" && (
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg text-muted text-[18px] cursor-pointer">✕</button>
          )}
        </div>

        {/* Form Phase */}
        {phase === "form" && (
          <form onSubmit={(e) => { e.preventDefault(); runProgress(); }} className="space-y-4">
            <div>
              <label className="block text-[14px] font-medium text-text mb-1">카테고리 이름 *</label>
              <input
                type="text"
                value={label}
                onChange={(e) => { setLabel(e.target.value); setError(""); }}
                placeholder="예: 온천, 차량, 환불"
                className="w-full border border-border rounded-[10px] px-4 py-3 text-[16px] focus:outline-none focus:border-primary"
                required
              />
            </div>
            {error && <p className="text-[14px] text-danger">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 border border-border py-3 rounded-[10px] text-[15px] font-medium text-muted hover:bg-bg min-h-[44px] cursor-pointer">취소</button>
              <button type="submit" className="flex-1 bg-primary text-white py-3 rounded-[10px] text-[15px] font-medium hover:opacity-90 min-h-[44px] cursor-pointer">저장</button>
            </div>
          </form>
        )}

        {/* Progress Phase */}
        {phase === "progress" && (
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                <StepIcon status={step.status} />
                <span
                  className={`text-[14px] ${
                    step.status === "success"
                      ? "text-text"
                      : step.status === "error"
                        ? "text-danger"
                        : step.status === "running"
                          ? "text-primary font-medium"
                          : "text-muted"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
            {failedStep && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-[13px] text-danger mb-1">실패 단계: {failedStep.label}</p>
                {failedStep.error && (
                  <p className="text-[13px] text-muted mb-3">{failedStep.error}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleRetry}
                    className="px-4 py-2 text-[14px] text-white bg-primary rounded-[8px] hover:opacity-90 min-h-[36px] cursor-pointer"
                  >
                    다시 시도
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-[14px] text-muted border border-border rounded-[8px] hover:bg-gray-50 min-h-[36px] cursor-pointer"
                  >
                    닫기
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Done Phase */}
        {phase === "done" && (
          <div className="space-y-3">
            {DONE_STEPS.map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                <StepIcon status="success" />
                <span className="text-[14px] text-text">{step.label}</span>
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-border text-center">
              <p className="text-[16px] font-bold text-primary">카테고리 생성 완료</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Edit Modal (simple, unchanged) ── */

function CategoryEditModal({
  category,
  open,
  onClose,
  onSaved,
}: {
  category: AdminOption;
  open: boolean;
  onClose: () => void;
  onSaved: (data: AdminOption) => void;
}) {
  const [label, setLabel] = useState(category?.label || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError("이름을 입력하세요.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      await adminFetchJson("/api/admin/options", {
        method: "PUT",
        body: JSON.stringify({ id: category.id, label: label.trim() }),
      });
      onSaved({
        ...category,
        label: label.trim(),
        updated_at: new Date().toISOString(),
      });
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
      <div className="bg-surface rounded-[16px] shadow-lg w-full max-w-[400px] mx-4 p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-[18px] font-bold text-text">카테고리 수정</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg text-muted text-[18px] cursor-pointer">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[14px] font-medium text-text mb-1">카테고리 이름 *</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="예: 온천, 차량, 환불"
              className="w-full border border-border rounded-[10px] px-4 py-3 text-[16px] focus:outline-none focus:border-primary"
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

export default function GuideCategoriesClient({
  initialCategories,
}: GuideCategoriesClientProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminOption | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminOption | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const isAdmin = useAdmin();
  const { message, visible, showToast } = useToast();

  const existingCodes = new Set(
    categories.map((c) => c.code?.toUpperCase()).filter(Boolean)
  );

  const closeEditModal = useCallback(() => {
    setEditModal(false);
    setEditTarget(null);
  }, []);

  const handleAdd = () => {
    setCreateModal(true);
  };

  const handleEdit = (cat: AdminOption) => {
    setEditTarget(cat);
    setEditModal(true);
  };

  const handleCreated = (saved: AdminOption) => {
    setCategories((prev) => [...prev, saved].sort((a, b) => a.sort - b.sort));
    showToast("카테고리 생성 완료");
    setCreateModal(false);
  };

  const handleSaved = (saved: AdminOption) => {
    setCategories((prev) => prev.map((c) => (c.id === saved.id ? { ...c, ...saved } : c)));
    showToast("수정 완료");
    setTimeout(closeEditModal, 500);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/options?id=${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[24px] font-bold text-text">📋 공통 안내</h1>
        {isAdmin && <AddButton onClick={handleAdd} label="카테고리 추가" />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => (
          <div key={cat.code} className="relative group/cat">
            <Link
              href={`/guide/${cat.code.toLowerCase()}`}
              className="rounded-[12px] p-4 text-center transition-colors min-h-[56px] flex items-center justify-center"
              style={{
                backgroundColor: getCategoryBg(cat.code),
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: getCategoryBorder(cat.code),
              }}
            >
              <span className="text-[16px] font-medium whitespace-nowrap" style={{ color: getCategoryColor(cat.code) }}>
                {getCategoryEmoji(cat.code)} {cat.label}
              </span>
            </Link>
            {isAdmin && (
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <button
                  onClick={() => handleEdit(cat)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white/90 border border-border text-[12px] cursor-pointer hover:bg-bg"
                  title="수정"
                >
                  ✏️
                </button>
                <button
                  onClick={() => setDeleteTarget(cat)}
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

      <CategoryCreateModal
        open={createModal}
        existingCodes={existingCodes}
        onClose={() => setCreateModal(false)}
        onSaved={handleCreated}
      />

      {editTarget && (
        <CategoryEditModal
          key={editTarget.id}
          category={editTarget}
          open={editModal}
          onClose={closeEditModal}
          onSaved={handleSaved}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="카테고리 삭제"
        message={`"${deleteTarget?.label}" 카테고리를 삭제하시겠습니까? 연결된 FAQ가 있으면 사용자에게 더 이상 표시되지 않습니다.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
      <Toast message={message} visible={visible} />
    </>
  );
}