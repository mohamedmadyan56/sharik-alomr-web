import { NextResponse, type NextRequest } from "next/server";

const userCookie = process.env.WEB_COOKIE_NAME ?? "sharik_web_session";
const adminCookie = process.env.ADMIN_COOKIE_NAME ?? "sharik_admin_session";

/**
 * حارس تفاؤلي سريع: يمنع الوصول للداشبورد بدون كوكي جلسة.
 * التحقق الحقيقي من صلاحية الجلسة يتم في layout على الخادم عبر BFF.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();

  if (pathname.startsWith("/dashboard/admin")) {
    if (!request.cookies.has(adminCookie)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard/user") || pathname.startsWith("/onboarding")) {
    if (!request.cookies.has(userCookie)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding", "/admin/:path*"],
};
