import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(req: NextRequest) {
  // Supabase URL ve anon key'i al
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Supabase istemcisini oluştur
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  // Cookie'den oturum bilgisini al
  const authCookie = req.cookies.get("sb-auth-token")?.value;
  let session = null;

  if (authCookie) {
    try {
      const cookieData = JSON.parse(authCookie);
      if (cookieData?.access_token) {
        // Access token ile oturumu doğrula
        const { data, error } = await supabase.auth.getUser(
          cookieData.access_token
        );
        if (!error && data.user) {
          session = { user: data.user };
        }
      }
    } catch (e) {
      console.error("Cookie parsing error:", e);
    }
  }

  // Kullanıcı giriş yapmamışsa ve korumalı bir sayfaya erişmeye çalışıyorsa
  if (!session && req.nextUrl.pathname.startsWith("/dashboard")) {
    const redirectUrl = new URL("/login", req.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
