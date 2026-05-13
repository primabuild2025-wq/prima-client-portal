'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLang } from '@/lib/context/LanguageContext';
import { useSidebar } from '@/lib/context/SidebarContext';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLang();
  const { open, setOpen } = useSidebar();
  const [role, setRole] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase.from('users').select('role').eq('id', session.user.id).single()
        .then(({ data }) => setRole(data?.role || null));
    });
  }, []);

  const navItems = [
    { label: t('Dashboard', 'לוח בקרה'),  href: '/dashboard',     icon: '⬛' },
    { label: t('Projects', 'פרויקטים'),   href: '/projects',      icon: '📁' },
    { label: t('Tasks', 'משימות'),         href: '/tasks',         icon: '✅' },
    { label: t('Notifications', 'התראות'), href: '/notifications', icon: '🔔' },
    ...(role === 'admin' ? [{ label: t('Users', 'משתמשים'), href: '/admin/users', icon: '👥' }] : []),
  ];

  const navigate = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  const sidebarContent = (
    <aside className="flex flex-col space-y-6 h-full">
      <div className="rounded-3xl bg-black/40 p-4 text-center">
        <p className="text-sm uppercase text-white/70">Prima Build</p>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <button
            key={item.href}
            onClick={() => navigate(item.href)}
            className={`flex w-full items-center gap-3 rounded-3xl px-4 py-3 text-white transition hover:bg-white/10 ${
              pathname === item.href ? 'bg-white/10 font-semibold' : ''
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block rounded-3xl border border-white/10 bg-[#11144C] p-6">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <div className="relative z-10 w-72 bg-[#11144C] border-r border-white/10 p-6 flex flex-col">
            <button
              onClick={() => setOpen(false)}
              className="self-end text-white/40 hover:text-white text-xl mb-4 transition"
            >
              ✕
            </button>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}