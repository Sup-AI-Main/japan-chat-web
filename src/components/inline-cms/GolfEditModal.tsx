"use client";

import { useState, useEffect } from "react";
import { EditModalShell } from "./EditModalShell";

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
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
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
        const text = await res.text();
        let msg = "저장에 실패했습니다.";
        try { msg = JSON.parse(text).error || msg; } catch { /* ignore */ }
        throw new Error(msg);
      }

      const resBody = await res.json();
      const saved = resBody.data?.course;
      if (!saved?.id) {
        throw new Error("서버 응답이 올바르지 않습니다 (id 누락).");
      }
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 문제가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditModalShell
      open={open}
      title={golf ? "골프장 수정" : "골프장 추가"}
      onClose={onClose}
      onSave={handleSave}
      saving={saving}
      error={error}
    >
      {/* 기본 정보 */}
      <div className="mb-6">
        <h3 className="text-[15px] font-bold text-text mb-3">기본 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          <InputField label="표시명" value={form.display_name} onChange={(v) => update("display_name", v)} placeholder="골프장 표시 이름" />
          <InputField label="공식명" value={form.official_name} onChange={(v) => update("official_name", v)} placeholder="골프장 공식 이름" />
          <InputField label="주소" value={form.address} onChange={(v) => update("address", v)} placeholder="주소" />
          <InputField label="전화번호" value={form.phone} onChange={(v) => update("phone", v)} placeholder="000-000-0000" />
          <InputField label="Google Maps URL" value={form.google_maps_url} onChange={(v) => update("google_maps_url", v)} placeholder="https://maps.google.com/..." />
        </div>
      </div>

      {/* 코스 정보 */}
      <div className="mb-2">
        <h3 className="text-[15px] font-bold text-text mb-3">코스 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          <InputField label="코스 안내" value={form.course_summary} onChange={(v) => update("course_summary", v)} placeholder="코스 요약" />
          <InputField label="플레이/카트" value={form.play_cart} onChange={(v) => update("play_cart", v)} placeholder="카트 필수, 전동카트" />
          <InputField label="클럽하우스 식사" value={form.clubhouse_dining} onChange={(v) => update("clubhouse_dining", v)} placeholder="식사 가능" />
          <InputField label="목욕/샤워" value={form.bath_shower} onChange={(v) => update("bath_shower", v)} placeholder="샤워실 있음" />
          <InputField label="렌탈" value={form.rental} onChange={(v) => update("rental", v)} placeholder="클럽 렌탈 가능" />
          <InputField label="복장 규정" value={form.dress_code} onChange={(v) => update("dress_code", v)} placeholder="collar 있는 셔츠 필수" />
        </div>
      </div>
    </EditModalShell>
  );
}
