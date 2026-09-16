"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import LabelManager from "@/components/admin/LabelManager";

export default function LabelsPage() {
  const params = useParams();
  const area = params.area as string;
  const [selectedType, setSelectedType] = useState<"GOLF" | "HOTEL" | "RESTAURANT" | null>(null);

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[720px] mx-auto">
        <Link
          href={`/admin/${area}`}
          className="text-[14px] text-muted hover:text-primary mb-4 inline-flex items-center min-h-[44px]"
        >
          ← 관리자 대시보드
        </Link>

        <h1 className="text-[24px] font-bold text-text mb-2">라벨 관리</h1>
        <p className="text-[16px] text-muted mb-6">
          각 엔티티 유형의 섹션/필드 라벨과 표시 여부를 관리합니다.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(["GOLF", "HOTEL", "RESTAURANT"] as const).map((type) => {
            const labels = { GOLF: "골프장", HOTEL: "호텔", RESTAURANT: "맛집" };
            const emojis = { GOLF: "⛳", HOTEL: "🏨", RESTAURANT: "🍽" };
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className="rounded-[12px] p-4 text-center transition-colors min-h-[56px] flex items-center justify-center bg-surface border border-border hover:border-primary"
              >
                <span className="text-[16px] font-medium">
                  {emojis[type]} {labels[type]} 라벨
                </span>
              </button>
            );
          })}
        </div>

        {selectedType && (
          <LabelManager
            entityType={selectedType}
            onClose={() => setSelectedType(null)}
          />
        )}
      </div>
    </main>
  );
}
