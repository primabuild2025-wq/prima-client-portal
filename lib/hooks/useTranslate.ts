import { useState, useCallback } from 'react';

export function useTranslate() {
  const [cache] = useState<Map<string, string>>(new Map());

  const translate = useCallback(async (
    texts: string[],
    targetLang: 'EN' | 'HE'
  ): Promise<string[]> => {
    // Filter out empty strings and check cache
    const toTranslate: { index: number; text: string }[] = [];
    const results: string[] = new Array(texts.length).fill('');

    texts.forEach((text, i) => {
      if (!text?.trim()) {
        results[i] = text;
        return;
      }
      const cacheKey = `${targetLang}:${text}`;
      if (cache.has(cacheKey)) {
        results[i] = cache.get(cacheKey)!;
      } else {
        toTranslate.push({ index: i, text });
      }
    });

    if (toTranslate.length === 0) return results;

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: toTranslate.map(t => t.text),
          targetLang,
        }),
      });

      const data = await response.json();
      if (data.translations) {
        data.translations.forEach((translated: string, i: number) => {
          const original = toTranslate[i];
          results[original.index] = translated;
          cache.set(`${targetLang}:${original.text}`, translated);
        });
      }
    } catch (err) {
      // On error, return originals
      toTranslate.forEach(({ index, text }) => { results[index] = text; });
    }

    return results;
  }, [cache]);

  return { translate };
}