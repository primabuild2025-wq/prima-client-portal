'use client';

import Link from 'next/link';
import { useLang } from '@/lib/context/LanguageContext';

export default function HomePage() {
  const { t } = useLang();

  return (
    <main className="min-h-screen bg-bg-page text-text-primary">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-[32px] border border-border bg-bg-card p-12 shadow-md">
          <div className="flex flex-col items-center gap-6 text-center">
            <img src="/prima-build-04.svg" alt="Prima Build" className="h-20 w-auto" />
            <div>
              <h1 className="text-4xl font-bold text-text-primary">
                {t('Prima Build Project Portal', 'פורטל פרויקטים Prima Build')}
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-text-secondary">
                {t(
                  'A bilingual English / Hebrew project management portal with role-based access, file and media workflows, and dashboard visualization.',
                  'פורטל ניהול פרויקטים דו-לשוני עברית / אנגלית עם גישה מבוססת תפקידים, ניהול קבצים ומדיה, והמחשה גרפית.'
                )}
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/auth/login" className="rounded-full bg-accent px-6 py-3 text-accent-text font-medium transition hover:opacity-90">
                {t('Login', 'התחברות')}
              </Link>
              <Link href="/dashboard" className="rounded-full border border-accent text-accent px-6 py-3 font-medium transition hover:bg-accent hover:text-accent-text">
                {t('View Dashboard', 'צפה בלוח הבקרה')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}