"use client";

import { useState, useEffect } from "react";

interface GolfData {
  id?: string;
  display_name: string;
  official_name: string;
  address: string;
  phone: string;
  course_summary: string;
  play_cart: string;
  clubhouse_dining: string;
  bath_shower: string;
  rental: string;
  dress_code: string;
  google_maps_url: string;
}

const EMPTY_GOLF: GolfData = {
  display_name: "",
  official_name: "",
  address: "",
  phone: "",
  course_summary: "",
  play_cart: "",
  clubhouse_dining: "",
  bath_shower: "",
  rental: "",
  dress_code: "",
  google_maps_url: "",
};

interface GolfEditModalProps {
  golf: GolfData | null;
  area: string;
  open: boolean;
  onClose: () => void;
  onSaved: (golf: GolfData) => void;
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mb-3">
      <label className="text-[13px] font-medium text-text mb-1 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-border rounded-[8px] px-3 py-2 text-[14px] min-h-[40px] focus:outline-none focus:border-primary"
      />
    </div>
  );
}

export function GolfEditModal({ golf, area, open, onClose, onSaved }: GolfEditModalProps) {
  const [form, setForm] = useState<GolfData>(EMPTY_GOLF);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(golf ? { ...golf } : { ...EMPTY_GOLF });
      setError("");
      setSaving(false);
    }
  }, [open, golf]);

  const update = (key: keyof GolfData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.display_name.trim() && !form.official_name.trim()) {
      setError("골프장 이름은 필수입니다.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const isEdit = !!golf?.id;
      const res = await fetch("/api/admin/golf", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          id: golf?.id,
          area: area.toUpperCase(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "저장에 실패했습니다.");
      }

      const data = await res.json();
      onSaved(data.course ?? { ...form, id: golf?.id });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 문제가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-[12px] p-6 max-w-[480px] w-[90%] max-h-[80vh] overflow-y-auto shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[18px] font-bold text-text mb-4">
          {golf ? "골프장 수정" : "골프장 추가"}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-[8px] p-3 mb-4 text-[14px] text-danger">
            {error}
          </div>
        )}

        <div className="mb-4">
          <h3 className="text-[15px] font-bold text-text mb-2">기본 정보</h3>
          <InputField label="표시명" value={form.display_name} onChange={(v) => update("display_name", v)} placeholder="골프장 표시 이름" />
          <InputField label="공식명" value={form.official_name} onChange={(v) => update("official_name", v)} placeholder="골프장 공식 이름" />
          <InputField label="주소" value={form.address} onChange={(v) => update("address", v)} placeholder="주소" />
          <InputField label="전화번호" value={form.phone} onChange={(v) => update("phone", v)} placeholder="000-000-0000" />
          <InputField label="Google Maps URL" value={form.google_maps_url} onChange={(v) => update("google_maps_url", v)} placeholder="https://maps.google.com/..." />
        </div>

        <div className="mb-4">
          <h3 className="text-[15px] font-bold text-text mb-2">코스 정보</h3>
          <InputField label="코스 안내" value={form.course_summary} onChange={(v) => update("course_summary", v)} placeholder="코스 요약" />
          <InputField label="플레이/카트" value={form.play_cart} onChange={(v) => update("play_cart", v)} placeholder="카트 필수, 전동카트" />
          <InputField label="클럽하우스 식사" value={form.clubhouse_dining} onChange={(v) => update("clubhouse_dining", v)} placeholder="식사 가능" />
          <InputField label="목욕/샤워" value={form.bath_shower} onChange={(v) => update("bath_shower", v)} placeholder="샤워실 있음" />
          <InputField label="렌탈" value={form.rental} onChange={(v) => update("rental", v)} placeholder="클럽 렌탈 가능" />
          <InputField label="복장 규정" value={form.dress_code} onChange={(v) => update("dress_code", v)} placeholder=" collar 있는 셔츠 필수" />
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-border">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-[14px] text-muted border border-border rounded-[8px] hover:bg-gray-50 min-h-[40px]"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-[14px] text-white bg-primary rounded-[8px] hover:opacity-90 min-h-[40px] disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
