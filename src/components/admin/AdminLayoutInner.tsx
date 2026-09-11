"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

const LABELS: Record<string, string> = {
  home: "홈",
  dos: "도스",
  beppu: "벳푸",
  golf: "골프장",
  hotel: "호텔",
  restaurant: "식당",
  manage: "관리",
  new: "추가",
  faq: "FAQ",
};

function getLabel(segment: string) {
  return LABELS[segment] ?? segment;
}

export default function AdminLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/admin") {
    return <>{children}</>;
  }

  const segments = pathname
    .replace(/^\/admin\/?/, "")
    .split("/")
    .filter(Boolean);

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-50 bg-surface border-b border-border">
        <div className="max-w-[1200px] mx-auto px-4 flex items-center justify-between min-h-[44px]">
          <div className="flex items-center gap-1 text-[14px] overflow-x-auto">
            <Link
              href="/"
              className="text-muted hover:text-primary min-h-[44px] flex items-center shrink-0"
            >
              🏠
            </Link>
            <span className="text-muted mx-1">&gt;</span>
            <Link
              href="/admin/home"
              className="text-muted hover:text-primary min-h-[44px] flex items-center shrink-0"
            >
              관리자
            </Link>
            {segments.map((seg, i) => {
              const href = `/admin/${segments.slice(0, i + 1).join("/")}`;
              const isLast = i === segments.length - 1;

              return (
                <span key={href} className="flex items-center gap-1 shrink-0">
                  <span className="text-muted mx-1">&gt;</span>
                  {isLast ? (
                    <span className="text-text font-medium">
                      {getLabel(seg)}
                    </span>
                  ) : (
                    <Link
                      href={href}
                      className="text-primary hover:underline min-h-[44px] flex items-center"
                    >
                      {getLabel(seg)}
                    </Link>
                  )}
                </span>
              );
            })}
          </div>
          <LogoutButton />
        </div>
      </nav>
      {children}
    </div>
  );
}
