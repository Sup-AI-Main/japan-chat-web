"use client";

import { useState, useEffect } from "react";
import { EditModalShell } from "./EditModalShell";

interface AttractionData {
  id?: string;
  name_kr: string;
  name_jp: string;
  address_kr: string;
  address_jp: string;
  phone: string;
  google_maps_url: string;
  hours: string;
  closed_days: string;
  admission_fee: string;
  recommended_duration: string;
  parking_info: string;
  description: string;
  other_info: string;
}

const EMPTY_ATTRACTION: AttractionData = {
  name_kr: "",
  name_jp: "",
  address_kr: "",
  address_jp: "",
  phone: "",
  google_maps_url: "",
  hours: "",
  closed_days: "",
  admission_fee: "",
  recommended_duration: "",
  parking_info: "",
  description: "",
  other_info: "",
};

interface Props {
  open: boolean;
  onClose: () => void;
  attraction?: AttractionData | null;
  area: string;
  onSaved: (attraction: Record<string, unknown>) => void;
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-text mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-[8px] border border-border bg-surface px-3 py-2 text-[14px] text-text min-h-[80px]"
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-[8px] border border-border bg-surface px-3 py-2 text-[14px] text-text"
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

export default function AttractionEditModal({ open, onClose, attraction, area, onSaved }: Props) {
  const [form, setForm] = useState<AttractionData>(EMPTY_ATTRACTION);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!attraction?.id;

  useEffect(() => {
    setForm(attraction ? { ...attraction } : { ...EMPTY_ATTRACTION });
    setError("");
  }, [attraction, open]);

  function set<K extends keyof AttractionData>(key: K, value: AttractionData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name_kr.trim()) {
      setError("이름(한국어)은 필수입니다.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = "/api/admin/attraction";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          id: attraction?.id,
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
      const saved = resBody.data?.attraction;
      if (!saved?.id) {
        throw new Error("서버 응답이 올바르지 않습니다 (id 누락).");
      }
      if (!saved.name && saved.name_kr) saved.name = saved.name_kr;
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditModalShell
      open={open}
      title={isEdit ? "주변 볼거리 수정" : "주변 볼거리 추가"}
      onClose={onClose}
      onSave={handleSave}
      saving={saving}
      error={error}
    >
      <div className="space-y-4">
        <InputField label="이름 (한국어)" value={form.name_kr} onChange={(v) => set("name_kr", v)} required />
        <InputField label="이름 (일본어)" value={form.name_jp} onChange={(v) => set("name_jp", v)} />
        <InputField label="주소 (한국어)" value={form.address_kr} onChange={(v) => set("address_kr", v)} />
        <InputField label="주소 (일본어)" value={form.address_jp} onChange={(v) => set("address_jp", v)} />
        <InputField label="전화번호" value={form.phone} onChange={(v) => set("phone", v)} />
        <InputField label="Google Maps URL" value={form.google_maps_url} onChange={(v) => set("google_maps_url", v)} placeholder="https://maps.google.com/..." />
        <InputField label="운영시간" value={form.hours} onChange={(v) => set("hours", v)} placeholder="09:00~17:00" />
        <InputField label="휴무일" value={form.closed_days} onChange={(v) => set("closed_days", v)} placeholder="매주 월요일" />
        <InputField label="입장료" value={form.admission_fee} onChange={(v) => set("admission_fee", v)} placeholder="무료 / 성인 1000엔" />
        <InputField label="추천 체류시간" value={form.recommended_duration} onChange={(v) => set("recommended_duration", v)} placeholder="1~2시간" />
        <InputField label="주차 정보" value={form.parking_info} onChange={(v) => set("parking_info", v)} type="textarea" />
        <InputField label="설명" value={form.description} onChange={(v) => set("description", v)} type="textarea" />
        <InputField label="기타 안내" value={form.other_info} onChange={(v) => set("other_info", v)} type="textarea" />
      </div>
    </EditModalShell>
  );
}
