'use client';

import Link from 'next/link';
import { useLang } from '@/lib/context/LanguageContext';

export default function HomePage() {
  const { t } = useLang();

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-[32px] border border-white/10 bg-[#11144C] p-12 shadow-2xl shadow-black/40">
          <div className="flex flex-col items-center gap-6 text-center">
            <img src="/prima-build-04.svg" alt="Prima Build" className="h-20 w-auto" />
            <div>
              <h1 className="text-4xl font-bold">
                {t('Prima Build Project Portal', 'פורטל פרויקטים Prima Build')}
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-white/80">
                {t(
                  'A bilingual English / Hebrew project management portal with role-based access, file and media workflows, and dashboard visualization.',
                  'פורטל ניהול פרויקטים דו-לשוני עברית / אנגלית עם גישה מבוססת תפקידים, ניהול קבצים ומדיה, והמחשה גרפית.'
                )}
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/auth/login" className="rounded-full bg-white px-6 py-3 text-black transition hover:bg-slate-200">
                {t('Login', 'התחברות')}
              </Link>
              <Link href="/dashboard" className="rounded-full border border-white px-6 py-3 text-white transition hover:bg-white/10">
                {t('View Dashboard', 'צפה בלוח הבקרה')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}