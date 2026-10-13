import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isDemo } from "@/lib/mode";

export async function proxy(request: NextRequest) {
  const isLogin = request.nextUrl.pathname.startsWith("/login");

  if (isDemo()) {
    return isLogin ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getClaims memverifikasi token secara lokal (tanpa round-trip ke Supabase di setiap halaman)
  let loggedIn = false;
  try {
    const { data } = await supabase.auth.getClaims();
    loggedIn = !!data?.claims;
  } catch {
    loggedIn = false;
  }

  if (!loggedIn && !isLogin) return NextResponse.redirect(new URL("/login", request.url));
  if (loggedIn && isLogin) return NextResponse.redirect(new URL("/", request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|webmanifest)$).*)"],
};
