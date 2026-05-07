'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Language = 'EN' | 'HE';

type LanguageContextType = {
  lang: Language;
  setLang: (l: Language) => void;
  dir: 'ltr' | 'rtl';
  t: (en: string, he: string) => string;
  translateContent: (texts: string[]) => Promise<string[]>;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'EN',
  setLang: () => {},
  dir: 'ltr',
  t: (en) => en,
  translateContent: async (texts) => texts,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('EN');
  const [cache] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Language | null;
    if (saved === 'EN' || saved === 'HE') setLangState(saved);
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem('lang', l);
  };

  const translateContent = useCallback(async (texts: string[]): Promise<string[]> => {
    if (!texts.length) return [];

    const toTranslate: { index: number; text: string }[] = [];
    const results: string[] = new Array(texts.length).fill('');

    texts.forEach((text, i) => {
      if (!text?.trim()) { results[i] = text || ''; return; }
      const key = `${lang}:${text}`;
      if (cache.has(key)) {
        results[i] = cache.get(key)!;
      } else {
        toTranslate.push({ index: i, text });
      }
    });

    if (toTranslate.length > 0) {
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: toTranslate.map(x => x.text), targetLang: lang }),
        });
        const data = await res.json();
        if (data.translations) {
          data.translations.forEach((translated: string, i: number) => {
            const { index, text } = toTranslate[i];
            results[index] = translated;
            cache.set(`${lang}:${text}`, translated);
          });
        }
      } catch {
        toTranslate.forEach(({ index, text }) => { results[index] = text; });
      }
    }

    return results;
  }, [lang, cache]);

  const dir = lang === 'HE' ? 'rtl' : 'ltr';
  const t = (en: string, he: string) => lang === 'HE' ? he : en;

  return (
    <LanguageContext.Provider value={{ lang, setLang, dir, t, translateContent }}>
      <div dir={dir}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);