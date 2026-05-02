import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

type AppRole = "OWNER" | "ADMIN" | "OPERATOR" | "USER";

const ROUTE_ROLES: { pattern: RegExp; roles: AppRole[] }[] = [
  { pattern: /^\/admin\/users/, roles: ["OWNER"] },
  { pattern: /^\/admin\/templates/, roles: ["OWNER", "ADMIN"] },
  { pattern: /^\/admin\/bands/, roles: ["OWNER", "ADMIN"] },
  { pattern: /^\/admin\/modes/, roles: ["OWNER", "ADMIN"] },
  { pattern: /^\/admin\/events/, roles: ["OWNER", "ADMIN", "OPERATOR"] },
  { pattern: /^\/admin/, roles: ["OWNER", "ADMIN", "OPERATOR"] },
];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/esqueci-minha-senha") ||
    pathname.startsWith("/nova-senha") ||
    pathname.startsWith("/verificar-email") ||
    pathname.startsWith("/verificar-certificado") ||
    pathname.startsWith("/api/verificar-certificado") ||
    pathname.startsWith("/api/auth");

  if (isPublicRoute) {
    if (isLoggedIn && (pathname.startsWith("/login") || pathname.startsWith("/register"))) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Role-based route protection
  const userRole = req.auth?.user?.role as AppRole | undefined;
  for (const rule of ROUTE_ROLES) {
    if (rule.pattern.test(pathname)) {
      if (!userRole || !rule.roles.includes(userRole)) {
        return NextResponse.redirect(new URL("/", req.nextUrl));
      }
      break;
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)"],
};
