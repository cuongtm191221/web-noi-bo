import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Sidebar } from '@/components/sidebar';
import { TopNavbar } from '@/components/top-navbar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-cream)' }}>
      <Sidebar session={session} />
      <div style={{ marginLeft: '240px' }}>
        <TopNavbar session={session} />
        <main style={{ padding: '24px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}