import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "일본 골프 여행 가이드",
  description: "도스 · 벳푸 골프 여행 현지 가이드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
