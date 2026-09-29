import Link from "next/link";
import { getCommonCategories } from "@/lib/supabase-cms";
import GuideCategoriesClient from "@/components/GuideCategoriesClient";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function GuidePage() {
  const commonCategories = await getCommonCategories();

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[720px] mx-auto">
        <Link
          href={routes.home()}
          className="text-[14px] text-muted hover:text-primary mb-2 inline-flex items-center min-h-[44px]"
        >
          ← 홈으로
        </Link>

        <GuideCategoriesClient initialCategories={commonCategories} />
      </div>
    </main>
  );
}
