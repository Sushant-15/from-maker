'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/quizzes', label: 'Quizzes', icon: '📝' },
];

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <>
      <div
        className={cn('sidebar-overlay', isOpen && 'sidebar-overlay-open')}
        onClick={onClose}
      />
      <aside className={cn('sidebar', isOpen && 'sidebar-open')}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">🧠</div>
          <span className="sidebar-brand-text">QuizArena</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'sidebar-link',
                pathname.startsWith(item.href) && 'sidebar-link-active'
              )}
              onClick={onClose}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-divider" />

        <div className="sidebar-footer">
          <button
            className="sidebar-link w-full"
            onClick={handleLogout}
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-family)' }}
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
