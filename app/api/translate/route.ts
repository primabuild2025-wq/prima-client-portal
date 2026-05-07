import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { texts, targetLang } = await req.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ translations: [] });
    }

    const apiKey = process.env.DEEPL_API_KEY!;
    const isFree = apiKey.endsWith(':fx');
    const url = isFree
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate';

    const body = new URLSearchParams();
    body.append('target_lang', targetLang === 'HE' ? 'HE' : 'EN');
    texts.forEach((t: string) => body.append('text', t));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const data = await response.json();
    const translations = data.translations.map((t: any) => t.text);
    return NextResponse.json({ translations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}