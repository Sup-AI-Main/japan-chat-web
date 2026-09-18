import Link from "next/link";
import { notFound } from "next/navigation";
import { getAttractions, resolveArea, getAdminOptions } from "@/lib/supabase-cms";
import { getAreaEmoji } from "@/lib/display";
import { routes } from "@/lib/routes";

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const options = await getAdminOptions();
    const areas = options.filter(o => o.option_type === 'AREA' && o.active !== 'FALSE' && o.code !== 'ALL');
    return areas.map((a) => ({ area: a.code.toLowerCase() }));
  } catch {
    return [{ area: 'dos' }, { area: 'beppu' }];
  }
}

export default async function AttractionListPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  const currentArea = await resolveArea(area);
  if (!currentArea) notFound();

  const areaCode = currentArea.code;
  const areaLabel = currentArea.label;

  let attractions;
  try {
    attractions = await getAttractions(areaCode);
  } catch {
    return (
      <main className="min-h-screen px-4 py-6">
        <div className="max-w-[720px] mx-auto">
          <p className="text-muted">현재 정보를 불러오지 못했습니다.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[720px] mx-auto">
        <Link
          href={routes.area(area)}
          className="text-[14px] text-muted hover:text-primary mb-2 inline-flex items-center min-h-[44px]"
        >
          ← {getAreaEmoji(areaCode)} {areaLabel}
        </Link>
        <h1 className="text-[24px] font-bold text-text mb-6">
          🗾 {areaLabel} 주변 볼거리
        </h1>

        {attractions.length === 0 ? (
          <div className="bg-surface border border-border rounded-[12px] p-8 text-center">
            <p className="text-muted">등록된 볼거리가 없습니다.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {attractions.map((attr) => (
              <Link
                key={attr.id}
                href={routes.areaAttractionDetail(area, attr.slug)}
                className="bg-surface border border-border rounded-[12px] p-4 hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[16px] font-bold text-text">{attr.name_kr}</h2>
                    {attr.name_jp && (
                      <p className="text-[13px] text-muted mt-0.5">{attr.name_jp}</p>
                    )}
                    {attr.address_kr && (
                      <p className="text-[13px] text-muted mt-1">📍 {attr.address_kr}</p>
                    )}
                  </div>
                  <span className="text-[20px]">🗺️</span>
                </div>
                {attr.description && (
                  <p className="text-[14px] text-muted mt-2 line-clamp-2">{attr.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
