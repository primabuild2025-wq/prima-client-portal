import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const nextPath = url.searchParams.get('next') ?? '/dashboard';

  // placeholder callback for auth providers
  return NextResponse.redirect(nextPath);
}
