import Link from 'next/link';
import { FileText, FolderTree, Users, Activity } from 'lucide-react';
import { Logo } from './logo';
import { SignOutButton } from './sign-out-button';
import type { Session } from 'next-auth';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Array<'admin' | 'editor' | 'viewer'>;
};

const navItems: NavItem[] = [
  { href: '/documents', label: 'Tài liệu', icon: FileText, roles: ['admin', 'editor', 'viewer'] },
  { href: '/categories', label: 'Danh mục', icon: FolderTree, roles: ['admin'] },
  { href: '/admin/users', label: 'Người dùng', icon: Users, roles: ['admin'] },
  { href: '/admin/audit-logs', label: 'Audit log', icon: Activity, roles: ['admin'] },
];

export function Sidebar({ session }: { session: Session }) {
  const role = session.user.role;
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-[270px] h-screen bg-white border-r border-border fixed left-0 top-0 flex flex-col">
      <div className="px-6 py-5 border-b border-border">
        <Logo />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-text-dark hover:bg-bg-cream hover:text-primary transition-all"
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-border">
        <div className="text-sm font-semibold">{session.user.name}</div>
        <div className="text-xs text-text-muted mb-2">{session.user.email}</div>
        <SignOutButton />
      </div>
    </aside>
  );
}
