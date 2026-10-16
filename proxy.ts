import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const PUBLIC_PATHS = ["/sign-in", "/register", "/auth", "/pending", "/unauthorized"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

/**
 * Proxy (Next 16 successor to middleware): refreshes the session, keeps
 * logged-out visitors on public pages, and holds pending/suspended accounts
 * on /pending. Role checks for admin paths live in requireAdmin().
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isPublic(pathname)) return response;
    return redirectTo(request, "/sign-in");
  }
  if (pathname === "/sign-in" || pathname === "/register") {
    return redirectTo(request, "/");
  }

  // Approval gate: pending/suspended accounts wait on /pending, and approved
  // accounts never sit on it.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (serviceKey) {
    try {
      const service = createServiceClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: profile } = await service
        .from("profiles")
        .select("is_deactivated")
        .eq("id", user.id)
        .single();
      const held = !profile || profile.is_deactivated;
      if (held && pathname !== "/pending") return redirectTo(request, "/pending");
      if (!held && pathname === "/pending") return redirectTo(request, "/");
    } catch {
      if (pathname !== "/pending") return redirectTo(request, "/pending");
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
