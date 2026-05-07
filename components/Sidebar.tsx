'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLang } from '@/lib/context/LanguageContext';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLang();

  const navItems = [
    { label: t('Dashboard', 'לוח בקרה'),  href: '/dashboard',     icon: '⬛' },
    { label: t('Projects', 'פרויקטים'),   href: '/projects',      icon: '📁' },
    { label: t('Tasks', 'משימות'),         href: '/tasks',         icon: '✅' },
    { label: t('Users', 'משתמשים'),        href: '/users',         icon: '👥' },
    { label: t('Notifications', 'התראות'), href: '/notifications', icon: '🔔' },
  ];

  return (
    <aside className="space-y-6 rounded-3xl border border-white/10 bg-[#11144C] p-6">
      <div className="rounded-3xl bg-black/40 p-4 text-center">
        <p className="text-sm uppercase text-white/70">Prima Build</p>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
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
}