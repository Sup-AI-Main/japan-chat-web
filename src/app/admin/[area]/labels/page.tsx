"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import LabelManager from "@/components/admin/LabelManager";

export default function LabelsPage() {
  const params = useParams();
  const area = params.area as string;
  const [selectedType, setSelectedType] = useState<"GOLF" | "HOTEL" | "RESTAURANT" | "ATTRACTION" | null>(null);

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[720px] mx-auto">
        <Link
          href={`/admin/${area}`}
          className="text-[14px] text-muted hover:text-primary mb-4 inline-flex items-center min-h-[44px]"
        >
          ← 관리자 대시보드
        </Link>

        <h1 className="text-[24px] font-bold text-text mb-2">Legacy 라벨 / 섹션 관리</h1>
        <p className="text-[16px] text-muted mb-6">
          이 화면은 기존 데이터 호환용입니다. CMS V2 콘텐츠는 각 엔티티의 "세부사항 수정"에서 관리하세요.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["GOLF", "HOTEL", "RESTAURANT", "ATTRACTION"] as const).map((type) => {
            const labels = { GOLF: "골프장", HOTEL: "호텔", RESTAURANT: "음식점", ATTRACTION: "주변 볼거리" };
            const emojis = { GOLF: "⛳", HOTEL: "🏨", RESTAURANT: "🍽", ATTRACTION: "🗺️" };
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
