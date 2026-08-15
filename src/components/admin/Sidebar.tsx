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
        className={cn(
          'fixed inset-0 bg-slate-900/50 z-40 md:hidden opacity-0 pointer-events-none transition-opacity duration-300',
          isOpen && 'opacity-100 pointer-events-auto'
        )}
        onClick={onClose}
      />
      <aside className={cn(
        'fixed top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 z-50 flex flex-col transition-transform duration-300 -translate-x-full md:translate-x-0',
        isOpen && 'translate-x-0'
      )}>
        <div className="flex items-center gap-3 p-6 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-600 to-fuchsia-800 flex items-center justify-center shadow-md shadow-fuchsia-500/20 text-sm">🧠</div>
          <span className="text-xl font-bold tracking-tight text-slate-900">QuizArena</span>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all',
                  isActive 
                    ? 'bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-50 hover:text-fuchsia-800 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
                onClick={onClose}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="h-px bg-slate-100 mx-4" />

        <div className="p-4">
          <button
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-600 transition-all hover:bg-red-50 hover:text-red-600 w-full text-left"
            onClick={handleLogout}
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
