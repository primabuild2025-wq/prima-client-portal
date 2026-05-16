'use client';

import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/context/LanguageContext';
import { useSidebar } from '@/lib/context/SidebarContext';

export default function Header() {
  const router = useRouter();
  const { lang, setLang, t } = useLang();
  const { open, setOpen } = useSidebar();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-[#11144C] px-4 md:px-6 py-4 text-white">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden flex flex-col gap-1.5 p-2 rounded-xl hover:bg-white/10 transition"
        >
          <span className="block h-0.5 w-5 bg-white" />
          <span className="block h-0.5 w-5 bg-white" />
          <span className="block h-0.5 w-5 bg-white" />
        </button>

        <img src="/prima_build-04.png" alt="Prima Build logo" className="h-10 md:h-12 w-auto" />
        <div className="hidden sm:block">
          <p className="text-sm text-white/80">Prima Build</p>
          <p className="text-xs text-white/60">
            {t('Project Management Portal', 'פורטל ניהול פרויקטים')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Language toggle */}
        <div className="flex rounded-full border border-white/20 overflow-hidden">
          <button
            onClick={() => setLang('EN')}
            className={`px-3 md:px-4 py-2 text-sm transition-colors ${
              lang === 'EN'
                ? 'bg-white text-[#11144C] font-semibold'
                : 'text-white hover:bg-white/10'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang('HE')}
            className={`px-3 md:px-4 py-2 text-sm transition-colors ${
              lang === 'HE'
                ? 'bg-white text-[#11144C] font-semibold'
                : 'text-white hover:bg-white/10'
            }`}
          >
            HE
          </button>
        </div>

        <span className="hidden md:block h-10 w-[1px] bg-white/20" />

        <button
          onClick={handleLogout}
          className="rounded-full border border-white/20 px-3 md:px-4 py-2 text-sm text-white hover:bg-white/10 transition"
        >
          {t('Logout', 'התנתק')}
        </button>
        <div className="hidden md:flex rounded-full bg-white/10 px-4 py-2 text-sm text-white">JD</div>
      </div>
    </header>
  );
}