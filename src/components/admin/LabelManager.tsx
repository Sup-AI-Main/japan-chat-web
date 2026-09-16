"use client";

import { useState, useEffect } from "react";
import { adminFetchJson } from "@/lib/admin-fetch";
import { useToast } from "@/components/Toast";

interface SectionDef {
  id: string;
  entity_type: string;
  section_key: string;
  label_ko: string;
  label_ja: string | null;
  sort: number;
  is_visible: boolean;
  updated_at: string;
}

interface FieldDef {
  id: string;
  field_key: string;
  label_ko: string;
  label_ja: string | null;
  field_type: string;
  section_key: string | null;
  sort: number;
  active: boolean;
  updated_at: string;
}

interface LabelManagerProps {
  entityType: "GOLF" | "HOTEL" | "RESTAURANT";
  onClose: () => void;
}

export default function LabelManager({ entityType, onClose }: LabelManagerProps) {
  const [sections, setSections] = useState<SectionDef[]>([]);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<SectionDef | null>(null);
  const [editingField, setEditingField] = useState<FieldDef | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, [entityType]);

  async function loadData() {
    setLoading(true);
    try {
      const [sectionsData, fieldsData] = await Promise.all([
        adminFetchJson<{ data: SectionDef[] }>(`/api/admin/section-definitions?entity_type=${entityType}`),
        adminFetchJson<{ data: FieldDef[] }>(`/api/admin/field-definitions?scope_entity_type=${entityType}`),
      ]);
      setSections(sectionsData.data || []);
      setFields(fieldsData.data || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }

  async function handleSectionUpdate(section: SectionDef, updates: Partial<SectionDef>) {
    try {
      await adminFetchJson("/api/admin/section-definitions", {
        method: "PUT",
        body: JSON.stringify({
          id: section.id,
          updated_at: section.updated_at,
          ...updates,
        }),
      });
      setSections((prev) =>
        prev.map((s) => (s.id === section.id ? { ...s, ...updates } : s))
      );
      setEditingSection(null);
      showToast("저장되었습니다");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "저장 실패");
    }
  }

  async function handleFieldUpdate(field: FieldDef, updates: Partial<FieldDef>) {
    try {
      await adminFetchJson("/api/admin/field-definitions", {
        method: "PUT",
        body: JSON.stringify({
          id: field.id,
          updated_at: field.updated_at,
          ...updates,
        }),
      });
      setFields((prev) =>
        prev.map((f) => (f.id === field.id ? { ...f, ...updates } : f))
      );
      setEditingField(null);
      showToast("저장되었습니다");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "저장 실패");
    }
  }

  const fieldsBySection = new Map<string, FieldDef[]>();
  for (const f of fields) {
    const key = f.section_key || "__none__";
    const list = fieldsBySection.get(key) || [];
    list.push(f);
    fieldsBySection.set(key, list);
  }

  const typeLabel = entityType === "GOLF" ? "골프장" : entityType === "HOTEL" ? "호텔" : "맛집";

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1100] p-4">
        <div className="bg-white rounded-[16px] w-full max-w-[640px] p-5">
          <p className="text-[15px] text-muted text-center py-8">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1100] p-4">
      <div className="bg-white rounded-[16px] w-full max-w-[720px] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[18px] font-bold text-text">{typeLabel} 라벨 관리</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-[18px]"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {sections.length === 0 ? (
            <p className="text-[14px] text-muted text-center py-8">
              섹션 정의가 없습니다. DB migration을 실행해 주세요.
            </p>
          ) : (
            <div className="space-y-4">
              {sections.map((section) => {
                const sectionFields = fieldsBySection.get(section.section_key) || [];
                return (
                  <div
                    key={section.id}
                    className="border border-border rounded-[10px] overflow-hidden"
                  >
                    {/* Section header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            handleSectionUpdate(section, { is_visible: !section.is_visible })
                          }
                          className={`w-8 h-5 rounded-full transition-colors relative ${
                            section.is_visible ? "bg-primary" : "bg-gray-300"
                          }`}
                          title={section.is_visible ? "숨기기" : "표시"}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                              section.is_visible ? "left-3.5" : "left-0.5"
                            }`}
                          />
                        </button>
                        <div>
                          <span className="text-[14px] font-bold text-text">
                            {section.label_ko}
                          </span>
                          {section.label_ja && (
                            <span className="text-[12px] text-muted ml-2">{section.label_ja}</span>
                          )}
                          <span className="text-[11px] text-muted ml-2">
                            ({section.section_key})
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingSection(editingSection?.id === section.id ? null : section)}
                        className="text-[12px] text-primary hover:underline"
                      >
                        {editingSection?.id === section.id ? "닫기" : "수정"}
                      </button>
                    </div>

                    {/* Section edit form */}
                    {editingSection?.id === section.id && (
                      <div className="px-4 py-3 bg-blue-50/50 border-t border-border">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-[11px] text-muted block mb-1">한국어 라벨</label>
                            <input
                              type="text"
                              defaultValue={section.label_ko}
                              onBlur={(e) => {
                                if (e.target.value !== section.label_ko) {
                                  handleSectionUpdate(section, { label_ko: e.target.value });
                                }
                              }}
                              className="w-full px-2 py-1.5 text-[13px] border border-border rounded-[6px]"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-muted block mb-1">일본어 라벨</label>
                            <input
                              type="text"
                              defaultValue={section.label_ja || ""}
                              onBlur={(e) => {
                                if (e.target.value !== (section.label_ja || "")) {
                                  handleSectionUpdate(section, { label_ja: e.target.value || null });
                                }
                              }}
                              className="w-full px-2 py-1.5 text-[13px] border border-border rounded-[6px]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] text-muted block mb-1">순서</label>
                          <input
                            type="number"
                            defaultValue={section.sort}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              if (val !== section.sort) {
                                handleSectionUpdate(section, { sort: val });
                              }
                            }}
                            className="w-20 px-2 py-1.5 text-[13px] border border-border rounded-[6px]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Fields within section */}
                    {sectionFields.length > 0 && (
                      <div className="px-4 py-2">
                        {sectionFields.map((field) => (
                          <div
                            key={field.id}
                            className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  handleFieldUpdate(field, { active: !field.active })
                                }
                                className={`w-6 h-4 rounded-full transition-colors relative ${
                                  field.active ? "bg-primary" : "bg-gray-300"
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                                    field.active ? "left-2.5" : "left-0.5"
                                  }`}
                                />
                              </button>
                              <span className="text-[13px] text-text">{field.label_ko}</span>
                              {field.label_ja && (
                                <span className="text-[11px] text-muted">{field.label_ja}</span>
                              )}
                              <span className="text-[10px] text-muted">({field.field_key})</span>
                            </div>
                            <button
                              onClick={() =>
                                setEditingField(editingField?.id === field.id ? null : field)
                              }
                              className="text-[11px] text-primary hover:underline"
                            >
                              {editingField?.id === field.id ? "닫기" : "수정"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Field edit form */}
                    {editingField && editingField.section_key === section.section_key && (
                      <div className="px-4 py-3 bg-green-50/50 border-t border-border">
                        <p className="text-[12px] text-muted mb-2">
                          필드: {editingField.field_key}
                        </p>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-[11px] text-muted block mb-1">한국어 라벨</label>
                            <input
                              type="text"
                              defaultValue={editingField.label_ko}
                              onBlur={(e) => {
                                if (e.target.value !== editingField.label_ko) {
                                  handleFieldUpdate(editingField, { label_ko: e.target.value });
                                }
                              }}
                              className="w-full px-2 py-1.5 text-[13px] border border-border rounded-[6px]"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-muted block mb-1">일본어 라벨</label>
                            <input
                              type="text"
                              defaultValue={editingField.label_ja || ""}
                              onBlur={(e) => {
                                if (e.target.value !== (editingField.label_ja || "")) {
                                  handleFieldUpdate(editingField, { label_ja: e.target.value || null });
                                }
                              }}
                              className="w-full px-2 py-1.5 text-[13px] border border-border rounded-[6px]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] text-muted block mb-1">순서</label>
                          <input
                            type="number"
                            defaultValue={editingField.sort}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              if (val !== editingField.sort) {
                                handleFieldUpdate(editingField, { sort: val });
                              }
                            }}
                            className="w-20 px-2 py-1.5 text-[13px] border border-border rounded-[6px]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-[14px] font-medium border border-border rounded-[8px] hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
