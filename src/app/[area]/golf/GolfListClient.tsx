"use client";

import { useState } from "react";
import Link from "next/link";
import type { GolfCourse } from "@/lib/types";
import {
  EditableContainer,
  AddButton,
  GolfEditModal,
} from "@/components/inline-cms";

interface GolfListClientProps {
  courses: GolfCourse[];
  area: string;
  areaLabel: string;
  areaEmoji: string;
}

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

export default function GolfListClient({
  courses: initialCourses,
  area,
  areaLabel,
  areaEmoji,
}: GolfListClientProps) {
  const [courses, setCourses] = useState<GolfCourse[]>(initialCourses);
  const [editModal, setEditModal] = useState<{ open: boolean; course: GolfCourse | null }>({
    open: false,
    course: null,
  });

  const handleSaved = (data: GolfData) => {
    setCourses((prev) => {
      const exists = prev.find((c) => c.id === data.id);
      if (exists) {
        return prev.map((c) => (c.id === data.id ? { ...c, ...data } as GolfCourse : c));
      }
      return [...prev, { ...data, area: area.toUpperCase(), active: "TRUE", status: "published", sort: 99, source_url: "", last_verified: "", updated_at: new Date().toISOString() } as GolfCourse];
    });
  };

  const handleDelete = async (course: GolfCourse) => {
    const res = await fetch(`/api/admin/golf?id=${course.id}`, { method: "DELETE" });
    if (res.ok) {
      setCourses((prev) => prev.filter((c) => c.id !== course.id));
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[24px] font-bold text-text">
          {areaEmoji} {areaLabel} ⛳ 골프장
        </h1>
        <AddButton onClick={() => setEditModal({ open: true, course: null })} label="골프장 추가" />
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted">등록된 골프장이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <EditableContainer
              key={course.id}
              entityType="golf"
              onEdit={() => setEditModal({ open: true, course })}
              onDelete={() => handleDelete(course)}
            >
              <Link
                href={`/${area}/golf/${course.id}`}
                className="block bg-surface border border-border rounded-[12px] p-4 hover:border-primary transition-colors"
              >
                <h2 className="text-[18px] font-bold text-text mb-1">
                  {course.display_name || course.official_name}
                </h2>
                {course.course_summary && (
                  <p className="text-[14px] text-muted line-clamp-2">
                    {course.course_summary}
                  </p>
                )}
                <span className="text-[13px] text-primary mt-2 inline-block">
                  자세히 보기 →
                </span>
              </Link>
            </EditableContainer>
          ))}
        </div>
      )}

      {editModal.open && (
        <GolfEditModal
          golf={
            editModal.course
              ? {
                  id: editModal.course.id,
                  display_name: editModal.course.display_name || "",
                  official_name: editModal.course.official_name || "",
                  address: editModal.course.address || "",
                  phone: editModal.course.phone || "",
                  course_summary: editModal.course.course_summary || "",
                  play_cart: editModal.course.play_cart || "",
                  clubhouse_dining: editModal.course.clubhouse_dining || "",
                  bath_shower: editModal.course.bath_shower || "",
                  rental: editModal.course.rental || "",
                  dress_code: editModal.course.dress_code || "",
                  google_maps_url: editModal.course.google_maps_url || "",
                }
              : null
          }
          area={area}
          open={editModal.open}
          onClose={() => setEditModal({ open: false, course: null })}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
