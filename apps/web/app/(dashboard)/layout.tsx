import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Sidebar } from '@/components/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-cream)' }}>
      <Sidebar session={session} />
      <main style={{ marginLeft: '270px', padding: '24px' }}>
        {children}
      </main>
    </div>
  );
}
