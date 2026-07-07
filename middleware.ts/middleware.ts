import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const EXTERNAL_ROLES   = ['client', 'designer', 'supervisor', 'Supervisor'];
const EXTERNAL_BLOCKED = ['/tasks', '/notifications', '/admin'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Redirect external users away from internal pages
  if (user) {
    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user.id).single();

    if (profile && EXTERNAL_ROLES.includes(profile.role)) {
      const path = request.nextUrl.pathname;
      if (EXTERNAL_BLOCKED.some(blocked => path.startsWith(blocked))) {
        return NextResponse.redirect(new URL('/projects', request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/tasks/:path*',
    '/notifications/:path*',
    '/admin/:path*',
    '/api/:path*',
  ],
};