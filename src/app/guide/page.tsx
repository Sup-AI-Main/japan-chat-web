import Link from "next/link";
import { getAdminOptions } from "@/lib/google-sheets";
import GuideCategoriesClient from "@/components/GuideCategoriesClient";

export const dynamic = "force-dynamic";

export default async function GuidePage() {
  const allOptions = await getAdminOptions();
  const commonCategories = allOptions
    .filter((o) => o.option_type === "CATEGORY" && o.group === "COMMON" && o.active !== "FALSE")
    .sort((a, b) => a.sort - b.sort);

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[720px] mx-auto">
        <Link
          href="/"
          className="text-[14px] text-muted hover:text-primary mb-2 inline-flex items-center min-h-[44px]"
        >
          ← 홈으로
        </Link>

        <GuideCategoriesClient initialCategories={commonCategories} />
      </div>
    </main>
  );
}