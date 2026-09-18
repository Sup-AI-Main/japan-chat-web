"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Attraction, ContentSection } from "@/lib/types";
import { useAdmin } from "@/hooks/use-admin";
import { EditToolbar, ConfirmModal, ContentSectionsRenderer } from "@/components/inline-cms";
import AttractionEditModal from "@/components/inline-cms/AttractionEditModal";
import { getCategoryEmoji } from "@/lib/display";
import { useToast, Toast } from "@/components/Toast";

interface SectionDef {
  id: string;
  entity_type: string;
  section_key: string;
  label_ko: string;
  label_ja: string | null;
  sort: number;
  is_visible: boolean;
}

interface Props {
  attraction: Attraction;
  area: string;
  contentSections: ContentSection[];
  sectionDefs: SectionDef[];
}

export default function AttractionDetailClient({ attraction: initial, area, contentSections, sectionDefs }: Props) {
  const [attraction, setAttraction] = useState(initial);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { message, visible, showToast } = useToast();
  const isAdmin = useAdmin();
  const router = useRouter();

  const sectionLabel = (key: string, fallback: string) => {
    const def = sectionDefs.find((s) => s.section_key === key);
    return def?.label_ko || fallback;
  };

  const handleSaved = (saved: Record<string, unknown>) => {
    setAttraction((prev) => ({ ...prev, ...saved } as Attraction));
    showToast("저장되었습니다.");
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/attraction?id=${attraction.id}&area=${area}`, { method: "DELETE" });
      if (res.ok) {
        router.push(`/${area}/attraction`);
      } else {
        showToast("삭제에 실패했습니다.");
      }
    } finally {
      setDeleting(false);
      setDeleteModal(false);
    }
  };

  const hasField = (v: string) => v && v.trim().length > 0;
  const hasBasicInfo = hasField(attraction.phone) || hasField(attraction.google_maps_url);
  const hasAddress = hasField(attraction.address_kr) || hasField(attraction.address_jp);
  const hasHours = hasField(attraction.hours) || hasField(attraction.closed_days);
  const hasAdmission = hasField(attraction.admission_fee) || hasField(attraction.recommended_duration);
  const hasParking = hasField(attraction.parking_info);
  const hasDescription = hasField(attraction.description);
  const hasOther = hasField(attraction.other_info);

  return (
    <div>
      {/* Title */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-bold text-text">
              {getCategoryEmoji("ATTRACTION")} {attraction.name_kr}
            </h1>
            {attraction.name_jp && (
              <p className="text-[14px] text-muted mt-1">{attraction.name_jp}</p>
            )}
          </div>
          {isAdmin && (
            <EditToolbar
              onEdit={() => setEditOpen(true)}
              onDelete={() => setDeleteModal(true)}
            />
          )}
        </div>
      </div>

      {/* Basic Info */}
      {hasBasicInfo && (
        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-text mb-3">{sectionLabel("basic_info", "기본 정보")}</h2>
          <div className="space-y-2">
            {attraction.phone && (
              <div>
                <span className="text-[12px] text-muted">전화</span>
                <p className="text-[14px] text-text">{attraction.phone}</p>
              </div>
            )}
            {attraction.google_maps_url && (
              <div>
                <span className="text-[12px] text-muted">Google Maps</span>
                <p className="text-[14px]">
                  <a href={attraction.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    지도에서 보기
                  </a>
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Address */}
      {hasAddress && (
        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-text mb-3">{sectionLabel("address", "주소")}</h2>
          <div className="space-y-1">
            {attraction.address_kr && <p className="text-[14px] text-text">{attraction.address_kr}</p>}
            {attraction.address_jp && <p className="text-[14px] text-muted">{attraction.address_jp}</p>}
          </div>
        </section>
      )}

      {/* Hours & Closed Days */}
      {hasHours && (
        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-text mb-3">{sectionLabel("hours", "운영시간")}</h2>
          <div className="space-y-2">
            {attraction.hours && (
              <div>
                <span className="text-[12px] text-muted">운영시간</span>
                <p className="text-[14px] text-text">{attraction.hours}</p>
              </div>
            )}
            {attraction.closed_days && (
              <div>
                <span className="text-[12px] text-muted">휴무일</span>
                <p className="text-[14px] text-text">{attraction.closed_days}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Admission & Duration */}
      {hasAdmission && (
        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-text mb-3">{sectionLabel("admission", "입장료")}</h2>
          <div className="space-y-2">
            {attraction.admission_fee && (
              <div>
                <span className="text-[12px] text-muted">입장료</span>
                <p className="text-[14px] text-text">{attraction.admission_fee}</p>
              </div>
            )}
            {attraction.recommended_duration && (
              <div>
                <span className="text-[12px] text-muted">추천 체류시간</span>
                <p className="text-[14px] text-text">{attraction.recommended_duration}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Parking */}
      {hasParking && (
        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-text mb-3">{sectionLabel("parking", "주차")}</h2>
          <p className="text-[14px] text-text whitespace-pre-wrap">{attraction.parking_info}</p>
        </section>
      )}

      {/* Description */}
      {hasDescription && (
        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-text mb-3">{sectionLabel("description", "설명")}</h2>
          <p className="text-[14px] text-text whitespace-pre-wrap">{attraction.description}</p>
        </section>
      )}

      {/* Other Info */}
      {hasOther && (
        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-text mb-3">{sectionLabel("other_info", "기타 안내")}</h2>
          <p className="text-[14px] text-text whitespace-pre-wrap">{attraction.other_info}</p>
        </section>
      )}

      {/* Content Sections */}
      <ContentSectionsRenderer
        parentType="ATTRACTION"
        parentId={attraction.id}
        initialSections={contentSections}
      />

      {/* Edit Modal */}
      <AttractionEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        attraction={attraction}
        area={area}
        onSaved={handleSaved}
      />

      {/* Delete Confirm */}
      <ConfirmModal
        open={deleteModal}
        title="주변 볼거리 삭제"
        message={`"${attraction.name_kr}"을(를) 삭제하시겠습니까?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal(false)}
        loading={deleting}
      />

      {/* Toast */}
      <Toast message={message} visible={visible} />
    </div>
  );
}
