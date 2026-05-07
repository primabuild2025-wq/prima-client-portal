'use client';

import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/context/LanguageContext';

export default function Header() {
  const router = useRouter();
  const { lang, setLang, t } = useLang();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-black px-6 py-4 text-white">
      <div className="flex items-center gap-4">
        <img src="/prima_build-04.png" alt="Prima Build logo" className="h-12 w-auto" />
        <div>
          <p className="text-sm text-white/70">Prima Build</p>
          <p className="text-xs text-white/50">
            {t('Project Management Portal', 'פורטל ניהול פרויקטים')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Language toggle */}
        <div className="flex rounded-full border border-white/10 overflow-hidden">
          <button
            onClick={() => setLang('EN')}
            className={`px-4 py-2 text-sm transition-colors ${
              lang === 'EN'
                ? 'bg-white text-black font-medium'
                : 'bg-[#11144C] text-white hover:bg-white/10'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang('HE')}
            className={`px-4 py-2 text-sm transition-colors ${
              lang === 'HE'
                ? 'bg-white text-black font-medium'
                : 'bg-[#11144C] text-white hover:bg-white/10'
            }`}
          >
            HE
          </button>
        </div>

        <span className="h-10 w-[1px] bg-white/10" />

       
        <button
          onClick={handleLogout}
          className="rounded-full border border-white/10 bg-[#11144C] px-4 py-2 text-sm text-white hover:bg-white/10"
        >
          {t('Logout', 'התנתק')}
        </button>
        <div className="rounded-full bg-white/10 px-4 py-2 text-sm">JD</div>
      </div>
    </header>
  );
}