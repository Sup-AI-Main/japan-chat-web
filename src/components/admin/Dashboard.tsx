"use client";

import { useState, useEffect, useCallback } from "react";
import { adminFetchJson } from "@/lib/admin-fetch";
import { useToast, Toast } from "@/components/Toast";
import FormModal from "@/components/admin/FormModal";
import ImpactDeleteModal from "@/components/admin/ImpactDeleteModal";
import type { FieldDef } from "@/components/admin/FormModal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AreaRow {
  id: string;
  code: string;
  name_kr: string;
  name_jp: string;
  icon: string;
  description: string;
  active: boolean;
  sort: number;
  updated_at: string;
}

interface CategoryRow {
  id: string;
  code: string;
  label: string;
  icon: string;
  description: string;
  group_type: string;
  active: boolean;
  sort: number;
  updated_at: string;
}

interface DashboardData {
  areas: AreaRow[];
  categories: CategoryRow[];
  entityCountsByArea: Record<string, number>;
  entityCountsByCategory: Record<string, number>;
  entityCountsByAreaCategory: Record<string, Record<string, number>>;
  faqCountsByCategory: Record<string, number>;
  faqCountsByArea: Record<string, number>;
}

interface ApiRes<T> {
  success: boolean;
  data: T;
  error?: string;
}

type ModalState =
  | { type: "area-create" }
  | { type: "area-edit"; area: AreaRow }
  | { type: "area-delete"; area: AreaRow; impact: Record<string, number> }
  | { type: "category-create"; areaId: string | null }
  | { type: "category-edit"; category: CategoryRow }
  | { type: "category-delete"; category: CategoryRow; impact: Record<string, number> }
  | null;

// ---------------------------------------------------------------------------
// Field definitions
// ---------------------------------------------------------------------------

const AREA_FIELDS: FieldDef[] = [
  { name: "code", label: "지역 코드", type: "text", required: true, placeholder: "예: FUKUOKA" },
  { name: "name_kr", label: "한국어 이름", type: "text", required: true, placeholder: "예: 후쿠오카" },
  { name: "name_jp", label: "일본어 이름", type: "text", placeholder: "예: 福岡" },
  { name: "icon", label: "아이콘/이모지", type: "text", placeholder: "예: 🏯" },
  { name: "description", label: "설명", type: "textarea", placeholder: "지역 설명" },
  { name: "sort", label: "표시 순서", type: "number", placeholder: "1" },
];

const CATEGORY_FIELDS: FieldDef[] = [
  { name: "code", label: "카테고리 코드", type: "text", required: true, placeholder: "예: GOLF" },
  { name: "label", label: "이름", type: "text", required: true, placeholder: "예: 골프장" },
  { name: "group_type", label: "그룹", type: "select", required: true, options: [
    { value: "AREA", label: "지역 (AREA)" },
    { value: "COMMON", label: "공통 (COMMON)" },
    { value: "SYSTEM", label: "시스템 (SYSTEM)" },
  ]},
  { name: "icon", label: "아이콘/이모지", type: "text", placeholder: "예: ⛳" },
  { name: "description", label: "설명", type: "textarea", placeholder: "카테고리 설명" },
  { name: "sort", label: "표시 순서", type: "number", placeholder: "1" },
];

// ---------------------------------------------------------------------------
// Dashboard Component
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const { message, visible, showToast } = useToast();

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const loadData = useCallback(async () => {
    try {
      const res = await adminFetchJson<ApiRes<DashboardData>>("/api/admin/dashboard");
      setData(res.data);
    } catch (err) {
      showToast("데이터를 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  function entityCountForArea(areaId: string): number {
    return data?.entityCountsByArea[areaId] ?? 0;
  }

  function categoryCountForArea(areaId: string): number {
    if (!data || !data.entityCountsByAreaCategory[areaId]) return 0;
    return Object.keys(data.entityCountsByAreaCategory[areaId]).length;
  }

  function entityCountForCategoryInArea(catId: string, areaId: string): number {
    return data?.entityCountsByAreaCategory[areaId]?.[catId] ?? 0;
  }

  function entityCountForCategory(catId: string): number {
    return data?.entityCountsByCategory[catId] ?? 0;
  }

  function faqCountForCategory(catId: string): number {
    return data?.faqCountsByCategory[catId] ?? 0;
  }

  // -----------------------------------------------------------------------
  // Area CRUD handlers
  // -----------------------------------------------------------------------

  async function handleCreateArea(values: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await adminFetchJson<ApiRes<AreaRow>>("/api/admin/areas", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          areas: [...prev.areas, res.data].sort((a, b) => a.sort - b.sort),
        };
      });
      setModal(null);
      showToast("지역이 추가되었습니다");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "추가 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateArea(values: Record<string, unknown>) {
    if (!modal || modal.type !== "area-edit") return;
    setSaving(true);
    try {
      const res = await adminFetchJson<ApiRes<AreaRow>>("/api/admin/areas", {
        method: "PUT",
        body: JSON.stringify({
          id: modal.area.id,
          updated_at: modal.area.updated_at,
          ...values,
        }),
      });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          areas: prev.areas
            .map((a) => (a.id === res.data.id ? res.data : a))
            .sort((a, b) => a.sort - b.sort),
        };
      });
      setModal(null);
      showToast("지역이 수정되었습니다");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "수정 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestDeleteArea(area: AreaRow) {
    try {
      const res = await adminFetchJson<ApiRes<Record<string, number>>>(
        `/api/admin/areas?id=${area.id}&confirmed=false`,
        { method: "DELETE" }
      );
      setModal({ type: "area-delete", area, impact: res.data });
    } catch (err) {
      showToast("영향 조회 실패");
    }
  }

  async function handleConfirmDeleteArea() {
    if (!modal || modal.type !== "area-delete") return;
    setSaving(true);
    try {
      await adminFetchJson(`/api/admin/areas?id=${modal.area.id}&confirmed=true`, {
        method: "DELETE",
      });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          areas: prev.areas.filter((a) => a.id !== modal.area!.id),
          categories: prev.categories, // categories not deleted with area
        };
      });
      if (selectedAreaId === modal.area.id) setSelectedAreaId(null);
      setModal(null);
      showToast("지역이 삭제되었습니다");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------------------------------------------
  // Category CRUD handlers
  // -----------------------------------------------------------------------

  async function handleCreateCategory(values: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await adminFetchJson<ApiRes<CategoryRow>>("/api/admin/manage-categories", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: [...prev.categories, res.data].sort((a, b) => a.sort - b.sort),
        };
      });
      setModal(null);
      showToast("카테고리가 추가되었습니다");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "추가 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateCategory(values: Record<string, unknown>) {
    if (!modal || modal.type !== "category-edit") return;
    setSaving(true);
    try {
      const res = await adminFetchJson<ApiRes<CategoryRow>>("/api/admin/manage-categories", {
        method: "PUT",
        body: JSON.stringify({
          id: modal.category.id,
          updated_at: modal.category.updated_at,
          ...values,
        }),
      });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: prev.categories
            .map((c) => (c.id === res.data.id ? res.data : c))
            .sort((a, b) => a.sort - b.sort),
        };
      });
      setModal(null);
      showToast("카테고리가 수정되었습니다");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "수정 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestDeleteCategory(category: CategoryRow) {
    try {
      const res = await adminFetchJson<ApiRes<Record<string, number>>>(
        `/api/admin/manage-categories?id=${category.id}&confirmed=false`,
        { method: "DELETE" }
      );
      setModal({ type: "category-delete", category, impact: res.data });
    } catch (err) {
      showToast("영향 조회 실패");
    }
  }

  async function handleConfirmDeleteCategory() {
    if (!modal || modal.type !== "category-delete") return;
    setSaving(true);
    try {
      await adminFetchJson(`/api/admin/manage-categories?id=${modal.category.id}&confirmed=true`, {
        method: "DELETE",
      });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: prev.categories.filter((c) => c.id !== modal.category!.id),
        };
      });
      setModal(null);
      showToast("카테고리가 삭제되었습니다");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------------------------------------------
  // Render: Loading
  // -----------------------------------------------------------------------

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-[14px] text-muted">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------

  // Categories for the selected area: all AREA-group categories
  const areaCategories = selectedAreaId
    ? data.categories.filter((c) => c.group_type === "AREA")
    : [];

  const commonCategories = data.categories.filter((c) => c.group_type === "COMMON");
  const systemCategories = data.categories.filter((c) => c.group_type === "SYSTEM");

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6">
      <Toast message={message} visible={visible} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-text">관리자 대시보드</h1>
      </div>

      {/* ================================================================ */}
      {/* AREA MANAGEMENT                                                  */}
      {/* ================================================================ */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-bold text-text">지역 관리</h2>
          <button
            onClick={() => setModal({ type: "area-create" })}
            className="px-4 py-2 text-[14px] text-white bg-primary rounded-[8px] hover:opacity-90 min-h-[40px]"
          >
            + 새 지역
          </button>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <div className="bg-surface border border-border rounded-[12px] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  <th className="text-left text-[12px] font-medium text-muted px-4 py-3">이름</th>
                  <th className="text-left text-[12px] font-medium text-muted px-4 py-3">코드</th>
                  <th className="text-left text-[12px] font-medium text-muted px-4 py-3">설명</th>
                  <th className="text-center text-[12px] font-medium text-muted px-4 py-3">순서</th>
                  <th className="text-center text-[12px] font-medium text-muted px-4 py-3">엔티티</th>
                  <th className="text-right text-[12px] font-medium text-muted px-4 py-3">액션</th>
                </tr>
              </thead>
              <tbody>
                {data.areas.map((area) => (
                  <tr
                    key={area.id}
                    className={`border-b border-border last:border-b-0 cursor-pointer hover:bg-primary-soft transition-colors ${selectedAreaId === area.id ? "bg-primary-soft" : ""}`}
                    onClick={() => setSelectedAreaId(selectedAreaId === area.id ? null : area.id)}
                  >
                    <td className="px-4 py-3">
                      <span className="text-[14px] font-medium text-text">
                        {area.icon} {area.name_kr}
                      </span>
                      {area.name_jp && (
                        <span className="text-[12px] text-muted ml-2">{area.name_jp}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted font-mono">{area.code}</td>
                    <td className="px-4 py-3 text-[13px] text-muted truncate max-w-[200px]">
                      {area.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-[13px] text-muted">{area.sort}</td>
                    <td className="px-4 py-3 text-center text-[13px] font-medium text-text">
                      {entityCountForArea(area.id)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setModal({ type: "area-edit", area })}
                          className="px-3 py-1.5 text-[12px] text-primary border border-primary rounded-[6px] hover:bg-primary-soft min-h-[36px]"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleRequestDeleteArea(area)}
                          className="px-3 py-1.5 text-[12px] text-danger border border-danger rounded-[6px] hover:bg-red-50 min-h-[36px]"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden flex flex-col gap-3">
          {data.areas.map((area) => (
            <div
              key={area.id}
              className={`bg-surface border rounded-[12px] p-4 transition-colors ${selectedAreaId === area.id ? "border-primary bg-primary-soft" : "border-border"}`}
            >
              <div
                className="cursor-pointer"
                onClick={() => setSelectedAreaId(selectedAreaId === area.id ? null : area.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[16px] font-bold text-text">
                    {area.icon} {area.name_kr}
                  </span>
                  <span className="text-[12px] text-muted font-mono">{area.code}</span>
                </div>
                {area.description && (
                  <p className="text-[13px] text-muted mb-2">{area.description}</p>
                )}
                <div className="flex gap-4 text-[12px] text-muted">
                  <span>순서: {area.sort}</span>
                  <span>엔티티: {entityCountForArea(area.id)}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                <button
                  onClick={() => setModal({ type: "area-edit", area })}
                  className="flex-1 px-3 py-2 text-[13px] text-primary border border-primary rounded-[8px] hover:bg-primary-soft min-h-[40px]"
                >
                  수정
                </button>
                <button
                  onClick={() => handleRequestDeleteArea(area)}
                  className="flex-1 px-3 py-2 text-[13px] text-danger border border-danger rounded-[8px] hover:bg-red-50 min-h-[40px]"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>

        {data.areas.length === 0 && (
          <div className="bg-surface border border-border rounded-[12px] p-8 text-center">
            <p className="text-[14px] text-muted">등록된 지역이 없습니다.</p>
            <button
              onClick={() => setModal({ type: "area-create" })}
              className="mt-3 px-4 py-2 text-[14px] text-white bg-primary rounded-[8px] hover:opacity-90 min-h-[40px]"
            >
              첫 지역 추가하기
            </button>
          </div>
        )}
      </section>

      {/* ================================================================ */}
      {/* AREA CATEGORIES (when area selected)                             */}
      {/* ================================================================ */}
      {selectedAreaId && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[17px] font-bold text-text">
              {data.areas.find((a) => a.id === selectedAreaId)?.icon}{" "}
              {data.areas.find((a) => a.id === selectedAreaId)?.name_kr} 카테고리
            </h2>
            <button
              onClick={() => setModal({ type: "category-create", areaId: selectedAreaId })}
              className="px-4 py-2 text-[14px] text-white bg-primary rounded-[8px] hover:opacity-90 min-h-[40px]"
            >
              + 카테고리 추가
            </button>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="bg-surface border border-border rounded-[12px] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    <th className="text-left text-[12px] font-medium text-muted px-4 py-3">이름</th>
                    <th className="text-left text-[12px] font-medium text-muted px-4 py-3">코드</th>
                    <th className="text-center text-[12px] font-medium text-muted px-4 py-3">그룹</th>
                    <th className="text-center text-[12px] font-medium text-muted px-4 py-3">순서</th>
                    <th className="text-center text-[12px] font-medium text-muted px-4 py-3">엔티티</th>
                    <th className="text-center text-[12px] font-medium text-muted px-4 py-3">FAQ</th>
                    <th className="text-right text-[12px] font-medium text-muted px-4 py-3">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {areaCategories.map((cat) => (
                    <tr key={cat.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-3 text-[14px] font-medium text-text">
                        {cat.icon} {cat.label}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted font-mono">{cat.code}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                          {cat.group_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-[13px] text-muted">{cat.sort}</td>
                      <td className="px-4 py-3 text-center text-[13px] font-medium text-text">
                        {entityCountForCategoryInArea(cat.id, selectedAreaId!)}
                      </td>
                      <td className="px-4 py-3 text-center text-[13px] font-medium text-text">
                        {faqCountForCategory(cat.id)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setModal({ type: "category-edit", category: cat })}
                            className="px-3 py-1.5 text-[12px] text-primary border border-primary rounded-[6px] hover:bg-primary-soft min-h-[36px]"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleRequestDeleteCategory(cat)}
                            className="px-3 py-1.5 text-[12px] text-danger border border-danger rounded-[6px] hover:bg-red-50 min-h-[36px]"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {areaCategories.map((cat) => (
              <div key={cat.id} className="bg-surface border border-border rounded-[12px] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[15px] font-bold text-text">
                    {cat.icon} {cat.label}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                    {cat.group_type}
                  </span>
                </div>
                <div className="flex gap-4 text-[12px] text-muted mb-3">
                  <span>코드: {cat.code}</span>
                  <span>순서: {cat.sort}</span>
                  <span>엔티티: {selectedAreaId ? entityCountForCategoryInArea(cat.id, selectedAreaId) : entityCountForCategory(cat.id)}</span>
                  <span>FAQ: {faqCountForCategory(cat.id)}</span>
                </div>
                <div className="flex gap-2 pt-3 border-t border-border">
                  <button
                    onClick={() => setModal({ type: "category-edit", category: cat })}
                    className="flex-1 px-3 py-2 text-[13px] text-primary border border-primary rounded-[8px] hover:bg-primary-soft min-h-[40px]"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleRequestDeleteCategory(cat)}
                    className="flex-1 px-3 py-2 text-[13px] text-danger border border-danger rounded-[8px] hover:bg-red-50 min-h-[40px]"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>

          {areaCategories.length === 0 && (
            <div className="bg-surface border border-border rounded-[12px] p-6 text-center">
              <p className="text-[14px] text-muted">이 지역에 카테고리가 없습니다.</p>
            </div>
          )}
        </section>
      )}

      {!selectedAreaId && data.areas.length > 0 && (
        <section className="mb-8">
          <div className="bg-surface border border-border rounded-[12px] p-6 text-center">
            <p className="text-[14px] text-muted">
              위에서 지역을 선택하면 해당 지역의 카테고리를 관리할 수 있습니다.
            </p>
          </div>
        </section>
      )}

      {/* ================================================================ */}
      {/* COMMON CATEGORIES                                                */}
      {/* ================================================================ */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-bold text-text">공통 카테고리 관리</h2>
          <button
            onClick={() => setModal({ type: "category-create", areaId: null })}
            className="px-4 py-2 text-[14px] text-white bg-primary rounded-[8px] hover:opacity-90 min-h-[40px]"
          >
            + 공통 카테고리 추가
          </button>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <div className="bg-surface border border-border rounded-[12px] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  <th className="text-left text-[12px] font-medium text-muted px-4 py-3">이름</th>
                  <th className="text-left text-[12px] font-medium text-muted px-4 py-3">코드</th>
                  <th className="text-center text-[12px] font-medium text-muted px-4 py-3">순서</th>
                  <th className="text-center text-[12px] font-medium text-muted px-4 py-3">엔티티</th>
                  <th className="text-center text-[12px] font-medium text-muted px-4 py-3">FAQ</th>
                  <th className="text-right text-[12px] font-medium text-muted px-4 py-3">액션</th>
                </tr>
              </thead>
              <tbody>
                {commonCategories.map((cat) => (
                  <tr key={cat.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3 text-[14px] font-medium text-text">
                      {cat.icon} {cat.label}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted font-mono">{cat.code}</td>
                    <td className="px-4 py-3 text-center text-[13px] text-muted">{cat.sort}</td>
                    <td className="px-4 py-3 text-center text-[13px] font-medium text-text">
                      {entityCountForCategory(cat.id)}
                    </td>
                    <td className="px-4 py-3 text-center text-[13px] font-medium text-text">
                      {faqCountForCategory(cat.id)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setModal({ type: "category-edit", category: cat })}
                          className="px-3 py-1.5 text-[12px] text-primary border border-primary rounded-[6px] hover:bg-primary-soft min-h-[36px]"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleRequestDeleteCategory(cat)}
                          className="px-3 py-1.5 text-[12px] text-danger border border-danger rounded-[6px] hover:bg-red-50 min-h-[36px]"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden flex flex-col gap-3">
          {commonCategories.map((cat) => (
            <div key={cat.id} className="bg-surface border border-border rounded-[12px] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[15px] font-bold text-text">
                  {cat.icon} {cat.label}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-600">
                  COMMON
                </span>
              </div>
              <div className="flex gap-4 text-[12px] text-muted mb-3">
                <span>코드: {cat.code}</span>
                <span>순서: {cat.sort}</span>
                <span>엔티티: {entityCountForCategory(cat.id)}</span>
                <span>FAQ: {faqCountForCategory(cat.id)}</span>
              </div>
              <div className="flex gap-2 pt-3 border-t border-border">
                <button
                  onClick={() => setModal({ type: "category-edit", category: cat })}
                  className="flex-1 px-3 py-2 text-[13px] text-primary border border-primary rounded-[8px] hover:bg-primary-soft min-h-[40px]"
                >
                  수정
                </button>
                <button
                  onClick={() => handleRequestDeleteCategory(cat)}
                  className="flex-1 px-3 py-2 text-[13px] text-danger border border-danger rounded-[8px] hover:bg-red-50 min-h-[40px]"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>

        {commonCategories.length === 0 && (
          <div className="bg-surface border border-border rounded-[12px] p-6 text-center">
            <p className="text-[14px] text-muted">공통 카테고리가 없습니다.</p>
          </div>
        )}
      </section>

      {/* ================================================================ */}
      {/* SYSTEM CATEGORIES (read-only reference)                          */}
      {/* ================================================================ */}
      {systemCategories.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[17px] font-bold text-text mb-4">시스템 카테고리</h2>
          <div className="bg-surface border border-border rounded-[12px] p-4">
            <div className="flex flex-wrap gap-2">
              {systemCategories.map((cat) => (
                <span
                  key={cat.id}
                  className="text-[13px] px-3 py-1.5 rounded-full bg-gray-100 text-muted"
                >
                  {cat.icon} {cat.label}
                </span>
              ))}
            </div>
            <p className="text-[12px] text-muted mt-3">
              시스템 카테고리는 수정/삭제할 수 없습니다.
            </p>
          </div>
        </section>
      )}

      {/* ================================================================ */}
      {/* MODALS                                                           */}
      {/* ================================================================ */}

      {/* Area Create */}
      {modal?.type === "area-create" && (
        <FormModal
          open={true}
          title="새 지역 추가"
          fields={AREA_FIELDS}
          initialValues={{ sort: String(data.areas.length + 1) }}
          onSubmit={handleCreateArea}
          onCancel={() => setModal(null)}
          loading={saving}
          submitLabel="추가"
        />
      )}

      {/* Area Edit */}
      {modal?.type === "area-edit" && (
        <FormModal
          open={true}
          title={`지역 수정: ${modal.area.name_kr}`}
          fields={AREA_FIELDS}
          initialValues={{
            code: modal.area.code,
            name_kr: modal.area.name_kr,
            name_jp: modal.area.name_jp,
            icon: modal.area.icon,
            description: modal.area.description,
            sort: String(modal.area.sort),
          }}
          onSubmit={handleUpdateArea}
          onCancel={() => setModal(null)}
          loading={saving}
        />
      )}

      {/* Area Delete */}
      {modal?.type === "area-delete" && (
        <ImpactDeleteModal
          open={true}
          title={`${modal.area.name_kr} 지역을 삭제하시겠습니까?`}
          items={[
            { label: "엔티티", count: modal.impact.entities ?? 0 },
            { label: "호텔", count: modal.impact.hotels ?? 0 },
            { label: "골프장", count: modal.impact.golf_courses ?? 0 },
            { label: "맛집", count: modal.impact.restaurants ?? 0 },
            { label: "FAQ", count: modal.impact.faq ?? 0 },
            { label: "이동시간", count: modal.impact.travel_times ?? 0 },
            { label: "콘텐츠 섹션", count: modal.impact.content_sections ?? 0 },
            { label: "포함/제외", count: modal.impact.includes_excludes ?? 0 },
            { label: "필드 값", count: modal.impact.entity_field_values ?? 0 },
            { label: "카테고리 연결", count: modal.impact.entity_categories ?? 0 },
          ]}
          onConfirm={handleConfirmDeleteArea}
          onCancel={() => setModal(null)}
          loading={saving}
        />
      )}

      {/* Category Create */}
      {modal?.type === "category-create" && (
        <FormModal
          open={true}
          title="새 카테고리 추가"
          fields={CATEGORY_FIELDS}
          initialValues={{
            group_type: modal.areaId ? "AREA" : "COMMON",
            sort: String(data.categories.length + 1),
          }}
          onSubmit={handleCreateCategory}
          onCancel={() => setModal(null)}
          loading={saving}
          submitLabel="추가"
        />
      )}

      {/* Category Edit */}
      {modal?.type === "category-edit" && (
        <FormModal
          open={true}
          title={`카테고리 수정: ${modal.category.label}`}
          fields={CATEGORY_FIELDS}
          initialValues={{
            code: modal.category.code,
            label: modal.category.label,
            group_type: modal.category.group_type,
            icon: modal.category.icon,
            description: modal.category.description,
            sort: String(modal.category.sort),
          }}
          onSubmit={handleUpdateCategory}
          onCancel={() => setModal(null)}
          loading={saving}
        />
      )}

      {/* Category Delete */}
      {modal?.type === "category-delete" && (
        <ImpactDeleteModal
          open={true}
          title={`"${modal.category.label}" 카테고리를 삭제하시겠습니까?`}
          items={[
            { label: "엔티티 (category_id)", count: modal.impact.entities_primary ?? 0 },
            { label: "카테고리 연결", count: modal.impact.entity_categories ?? 0 },
            { label: "FAQ", count: modal.impact.faq ?? 0 },
            { label: "필드 정의 범위", count: modal.impact.field_definition_scopes ?? 0 },
          ]}
          warning="카테고리만 삭제됩니다. 엔티티는 유지되며 category_id가 NULL로 변경됩니다."
          onConfirm={handleConfirmDeleteCategory}
          onCancel={() => setModal(null)}
          loading={saving}
        />
      )}
    </div>
  );
}
