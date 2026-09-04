import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { getAdminOptions } from "@/lib/google-sheets";
import { getAreaEmoji } from "@/lib/display";

export default async function AdminHomePage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin");

  const allOptions = await getAdminOptions();
  const areas = allOptions
    .filter((o) => o.option_type === "AREA" && o.active !== "FALSE")
    .sort((a, b) => a.sort - b.sort);

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[900px] mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-[24px] font-bold text-text">⚙️ 관리자</h1>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/api/admin/logout"
            className="text-[14px] text-muted hover:text-danger px-3 py-2 min-h-[44px] flex items-center"
          >
            로그아웃
          </a>
        </div>

        <h2 className="text-[18px] font-medium text-text mb-4">
          관리 지역을 선택하세요
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {areas.map((area) => (
            <Link
              key={area.id}
              href={`/admin/${area.code.toLowerCase()}`}
              className="bg-surface border border-border rounded-[12px] p-6 text-center hover:border-primary hover:bg-primary-soft transition-colors min-h-[44px]"
            >
              <span className="text-[24px] block mb-1">{getAreaEmoji(area.code)}</span>
              <span className="text-[18px] font-bold text-text">{area.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
