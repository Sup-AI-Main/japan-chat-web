import { resolveArea, getAttractionById, getContentSections } from "@/lib/supabase-cms";
import { listSectionDefinitions } from "@/lib/crud/section-definitions";
import { getCategoryEmoji } from "@/lib/display";
import Link from "next/link";
import { notFound } from "next/navigation";
import AttractionDetailClient from "./AttractionDetailClient";

export const revalidate = 300;

export default async function AttractionDetailPage({
  params,
}: {
  params: Promise<{ area: string; slug: string }>;
}) {
  const { area, slug } = await params;
  const currentArea = await resolveArea(area.toUpperCase());
  if (!currentArea) notFound();

  const areaCode = currentArea.code;

  const attraction = await getAttractionById(slug);
  if (!attraction || attraction.area !== areaCode) notFound();

  const [contentSectionsResult, sectionDefsResult] = await Promise.allSettled([
    getContentSections(attraction.id),
    listSectionDefinitions("ATTRACTION"),
  ]);

  const contentSections = contentSectionsResult.status === "fulfilled" ? contentSectionsResult.value : [];
  const sectionDefs = sectionDefsResult.status === "fulfilled" ? sectionDefsResult.value : [];

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[720px] mx-auto">
        <Link
          href={`/${area}/attraction`}
          className="text-[14px] text-muted hover:text-primary mb-2 inline-flex items-center min-h-[44px]"
        >
          ← {getCategoryEmoji("ATTRACTION")} 주변 볼거리 목록
        </Link>

        <AttractionDetailClient
          attraction={attraction}
          area={area}
          contentSections={contentSections}
          sectionDefs={sectionDefs}
        />
      </div>
    </main>
  );
}
