import { AdminGuard } from '@/components/layout/admin-guard';
import { AdminNav } from '@/components/layout/admin-nav';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        <AdminNav />
        <main className="p-6">{children}</main>
      </div>
    </AdminGuard>
  );
}
