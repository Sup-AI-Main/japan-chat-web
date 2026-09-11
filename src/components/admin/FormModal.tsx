"use client";

import { useState, useEffect } from "react";

export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "number";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface FormModalProps {
  open: boolean;
  title: string;
  fields: FieldDef[];
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
  loading?: boolean;
  submitLabel?: string;
}

export default function FormModal({
  open,
  title,
  fields,
  initialValues = {},
  onSubmit,
  onCancel,
  loading = false,
  submitLabel = "저장",
}: FormModalProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setValues(initialValues);
      setErrors({});
    }
  }, [open, initialValues]);

  if (!open) return null;

  function handleChange(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required && !String(values[field.name] ?? "").trim()) {
        newErrors[field.name] = `${field.label}을(를) 입력하세요`;
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSubmit(values);
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-[12px] p-6 max-w-[480px] w-[92%] shadow-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[17px] font-bold text-text mb-4">{title}</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-[13px] font-medium text-text mb-1">
                {field.label}
                {field.required && <span className="text-danger ml-0.5">*</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  value={String(values[field.name] ?? "")}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  disabled={loading}
                  className="w-full px-3 py-2 text-[14px] border border-border rounded-[8px] focus:outline-none focus:border-primary resize-none disabled:opacity-50"
                />
              ) : field.type === "select" ? (
                <select
                  value={String(values[field.name] ?? "")}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 text-[14px] border border-border rounded-[8px] focus:outline-none focus:border-primary disabled:opacity-50 bg-white"
                >
                  <option value="">선택하세요</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === "number" ? "number" : "text"}
                  value={String(values[field.name] ?? "")}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={loading}
                  className="w-full px-3 py-2 text-[14px] border border-border rounded-[8px] focus:outline-none focus:border-primary disabled:opacity-50"
                />
              )}
              {errors[field.name] && (
                <p className="text-[12px] text-danger mt-1">{errors[field.name]}</p>
              )}
            </div>
          ))}
          <div className="flex gap-3 justify-end mt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-[14px] text-muted border border-border rounded-[8px] hover:bg-gray-50 min-h-[40px]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-[14px] text-white bg-primary rounded-[8px] hover:opacity-90 min-h-[40px] disabled:opacity-50"
            >
              {loading ? "저장 중..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
