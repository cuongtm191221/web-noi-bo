import Link from 'next/link';
import { FileText, FolderTree, Users, Activity, Plug, UserCircle, Search, Database } from 'lucide-react';
import { Logo } from './logo';
import type { Session } from 'next-auth';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  roles: Array<'admin' | 'editor' | 'viewer'>;
};

const navItems: NavItem[] = [
  { href: '/documents', label: 'Tài liệu', icon: FileText, roles: ['admin', 'editor', 'viewer'] },
  { href: '/search', label: 'Tìm kiếm', icon: Search, roles: ['admin', 'editor', 'viewer'] },
  { href: '/categories', label: 'Danh mục', icon: FolderTree, roles: ['admin'] },
  { href: '/settings/integrations', label: 'Tích hợp MCP', icon: Plug, roles: ['admin', 'editor', 'viewer'] },
  { href: '/admin/users', label: 'Người dùng', icon: Users, roles: ['admin'] },
  { href: '/admin/audit-logs', label: 'Audit log', icon: Activity, roles: ['admin'] },
  { href: '/admin/backups', label: 'Backup', icon: Database, roles: ['admin'] },
];

export function Sidebar({ session }: { session: Session }) {
  if (!session?.user) return null;
  const role = session.user.role;
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside style={{
      width: '240px',
      height: '100vh',
      backgroundColor: 'white',
      borderRight: '1px solid var(--color-border)',
      position: 'fixed',
      left: 0,
      top: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '11px 16px',
        background: 'var(--color-text-dark)',
        boxShadow: '0 2px 4px rgba(30, 41, 59, 0.15)',
        borderBottom: '1px solid var(--color-text-dark)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Logo />
      </div>

      <nav style={{
        flex: 1,
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '14px',
              color: 'var(--color-text-dark)',
              textDecoration: 'none',
            }}
          >
            <item.icon style={{ width: '16px', height: '16px' }} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}