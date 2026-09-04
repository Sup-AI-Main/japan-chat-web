import Link from "next/link";
import { getActiveCategories } from "@/lib/google-sheets";
import { getCategoryEmoji, getCategoryColor, getCategoryBg, getCategoryBorder, COMMON_CATEGORIES } from "@/lib/display";

export default async function GuidePage() {
  const allCategories = await getActiveCategories();
  const commonCategories = allCategories.filter((c) => COMMON_CATEGORIES.includes(c.code));

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[720px] mx-auto">
        <Link
          href="/"
          className="text-[14px] text-muted hover:text-primary mb-2 inline-flex items-center min-h-[44px]"
        >
          ← 홈으로
        </Link>
        <h1 className="text-[24px] font-bold text-text mb-6">
          📋 공통 안내
        </h1>

        <div className="grid grid-cols-2 gap-3">
          {commonCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/guide/${cat.code.toLowerCase()}`}
              className="rounded-[12px] p-4 text-center transition-colors min-h-[56px] flex items-center justify-center"
              style={{
                backgroundColor: getCategoryBg(cat.code),
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: getCategoryBorder(cat.code),
              }}
            >
              <span className="text-[16px] font-medium whitespace-nowrap" style={{ color: getCategoryColor(cat.code) }}>
                {getCategoryEmoji(cat.code)} {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
