export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page-bg bg-main min-h-screen">
      {children}
    </div>
  );
}
