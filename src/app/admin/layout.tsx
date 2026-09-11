import AdminLayoutInner from "@/components/admin/AdminLayoutInner";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutInner>{children}</AdminLayoutInner>;
}
