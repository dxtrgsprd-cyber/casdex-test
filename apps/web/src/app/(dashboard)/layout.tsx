import { AuthGuard } from '@/components/layout/auth-guard';
import { TopNav } from '@/components/layout/top-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <TopNav />
        <main className="p-6">{children}</main>
      </div>
    </AuthGuard>
  );
}
