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
      <div className="rounded-2xl bg-white/10 p-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-white/80">Prima Build</p>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <button
            key={item.href}
            onClick={() => navigate(item.href)}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
              pathname === item.href
                ? 'bg-white text-[#11144C] font-semibold shadow-sm'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
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
      <div className="hidden md:block rounded-3xl bg-[#11144C] p-6 shadow-lg">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-72 bg-[#11144C] p-6 flex flex-col shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="self-end text-white/50 hover:text-white text-xl mb-4 transition"
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