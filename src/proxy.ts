import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

type AppRole = "OWNER" | "ADMIN" | "OPERATOR" | "USER";

/**
 * Recorte grosseiro de acesso às telas administrativas — quem entra na rota,
 * não o que enxerga dentro dela. O filtro por grupo é feito no servidor, em
 * cada action (`src/lib/group-access.ts`).
 *
 * `groupAdmin` libera as rotas de grupo a quem administra ao menos um clube
 * sem ter cargo global: aqui, no Edge, não há Prisma para consultar o quadro
 * de membros, então a informação chega pelo claim do JWT.
 */
type RouteRule = {
  pattern: RegExp;
  roles: AppRole[];
  /** Também vale para admin de grupo, qualquer que seja o cargo global. */
  allowGroupAdmin?: boolean;
};

const ROUTE_ROLES: RouteRule[] = [
  { pattern: /^\/admin\/users/, roles: ["OWNER"] },
  { pattern: /^\/admin\/audit/, roles: ["OWNER"] },
  { pattern: /^\/admin\/groups/, roles: ["OWNER", "ADMIN"], allowGroupAdmin: true },
  { pattern: /^\/admin\/templates/, roles: ["OWNER", "ADMIN"], allowGroupAdmin: true },
  { pattern: /^\/admin\/bands/, roles: ["OWNER", "ADMIN"] },
  { pattern: /^\/admin\/modes/, roles: ["OWNER", "ADMIN"] },
  {
    pattern: /^\/admin\/events/,
    roles: ["OWNER", "ADMIN", "OPERATOR"],
    allowGroupAdmin: true,
  },
  {
    pattern: /^\/admin/,
    roles: ["OWNER", "ADMIN", "OPERATOR"],
    allowGroupAdmin: true,
  },
];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  // Server Actions POST to the current route. Redirecting them (e.g. an
  // authenticated user calling an action from /login) breaks the action with
  // "An unexpected response was received from the server".
  const isServerAction = req.method === "POST" && req.headers.has("next-action");

  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/esqueci-minha-senha") ||
    pathname.startsWith("/nova-senha") ||
    pathname.startsWith("/verificar-email") ||
    // O tutorial ensina justamente a se cadastrar e entrar — precisa abrir
    // para quem ainda não tem conta.
    pathname.startsWith("/ajuda") ||
    pathname.startsWith("/verificar-certificado") ||
    pathname.startsWith("/eventos") ||
    pathname.startsWith("/api/verificar-certificado") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/auth");

  if (isPublicRoute) {
    if (
      isLoggedIn &&
      !isServerAction &&
      (pathname.startsWith("/login") || pathname.startsWith("/register"))
    ) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Role-based route protection
  const userRole = req.auth?.user?.role as AppRole | undefined;
  const isGroupAdmin = req.auth?.user?.groupAdmin === true;
  for (const rule of ROUTE_ROLES) {
    if (rule.pattern.test(pathname)) {
      const allowed =
        (!!userRole && rule.roles.includes(userRole)) ||
        (rule.allowGroupAdmin === true && isGroupAdmin);
      if (!allowed) {
        return NextResponse.redirect(new URL("/", req.nextUrl));
      }
      break;
    }
  }

  return NextResponse.next();
});

export const config = {
  // As extensões de estáticos precisam incluir as fontes: sem isso a fonte do
  // certificado é redirecionada para /login e o editor mede o texto na fonte
  // de fallback, desalinhando o preview do certificado real.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|ttf|woff|woff2)$).*)",
  ],
};
