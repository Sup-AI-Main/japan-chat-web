"use client";

import { useState } from "react";
import Link from "next/link";
import type { Attraction, EntityDetailsDocumentV1 } from "@/lib/types";
import { isValidV1Document } from "@/lib/entity-details/validate";
import { EditToolbar, AddButton, ConfirmModal } from "@/components/inline-cms";
import { useAdmin } from "@/hooks/use-admin";
import AttractionEditModal from "@/components/inline-cms/AttractionEditModal";

/** Extract a text value from details_json by section key + item key, for list card preview. */
function jsonTextValue(doc: EntityDetailsDocumentV1 | null | undefined, sectionKey: string, itemKey: string): string | undefined {
  if (!doc) return undefined;
  const section = doc.sections?.find((s) => s.key === sectionKey);
  if (!section) return undefined;
  const item = section.items?.find((i) => i.key === itemKey);
  if (!item) return undefined;
  const v = item.value;
  return typeof v === 'string' && v.trim() ? v : undefined;
}

interface Props {
  attractions: Attraction[];
  area: string;
  areaLabel: string;
  areaEmoji: string;
}

export default function AttractionListClient({ attractions: initial, area, areaLabel, areaEmoji }: Props) {
  const [attractions, setAttractions] = useState<Attraction[]>(initial);
  const [editModal, setEditModal] = useState<{ open: boolean; attraction: Attraction | null }>({ open: false, attraction: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; attraction: Attraction | null }>({ open: false, attraction: null });
  const [deleting, setDeleting] = useState(false);
  const isAdmin = useAdmin();

  const handleSaved = (saved: Attraction) => {
    setAttractions((prev) => {
      const sid = saved.id;
      const exists = prev.find((a) => a.id === sid);
      if (exists) {
        return prev.map((a) => (a.id === sid ? saved : a));
      }
      return [...prev, saved];
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.attraction) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/attraction?id=${deleteModal.attraction.id}&area=${area}`, { method: "DELETE" });
      if (res.ok) {
        setAttractions((prev) => prev.filter((a) => a.id !== deleteModal.attraction!.id));
        setDeleteModal({ open: false, attraction: null });
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {isAdmin && (
        <div className="mb-4">
          <AddButton onClick={() => setEditModal({ open: true, attraction: null })} label="주변 볼거리 추가" />
        </div>
      )}

      {attractions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted">등록된 주변 볼거리가 없습니다.</p>
          {isAdmin && (
            <div className="mt-4">
              <AddButton onClick={() => setEditModal({ open: true, attraction: null })} label="주변 볼거리 추가" />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {attractions.map((a) => {
            const doc = isValidV1Document(a.details_json) ? a.details_json : null;
            const displayAddress = doc ? (jsonTextValue(doc, 'address', 'address_kr') || a.address_kr) : a.address_kr;
            const displayHours = doc ? (jsonTextValue(doc, 'hours', 'hours') || a.hours) : a.hours;
            return (
            <div key={a.id} className="bg-surface border border-border rounded-[12px] p-4">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/${area}/attraction/${a.slug}`}
                  className="flex-1 min-w-0"
                >
                  <h3 className="text-[16px] font-bold text-text truncate">{a.name_kr}</h3>
                  {displayAddress && (
                    <p className="text-[13px] text-muted mt-1 truncate">{displayAddress}</p>
                  )}
                  {displayHours && (
                    <p className="text-[12px] text-muted mt-1">{displayHours}</p>
                  )}
                </Link>
                {isAdmin && (
                  <EditToolbar
                    onEdit={() => setEditModal({ open: true, attraction: a })}
                    onDelete={() => setDeleteModal({ open: true, attraction: a })}
                  />
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      <AttractionEditModal
        open={editModal.open}
        onClose={() => setEditModal({ open: false, attraction: null })}
        attraction={editModal.attraction}
        area={area}
        onSaved={handleSaved}
      />

      <ConfirmModal
        open={deleteModal.open}
        title="주변 볼거리 삭제"
        message={`"${deleteModal.attraction?.name_kr}"을(를) 삭제하시겠습니까?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ open: false, attraction: null })}
        loading={deleting}
      />
    </div>
  );
}
