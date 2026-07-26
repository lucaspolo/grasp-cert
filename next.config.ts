import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// CSP mínima e segura: bloqueia embed em iframes. Uma CSP completa
// (script-src etc.) exige nonces por request — fica para um passo futuro.
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 2 anos + subdomínios; navegadores ignoram HSTS em http://localhost
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  // O certificado lê a fonte e a marca d'água do disco em tempo de execução;
  // sem declarar, o tracing da Vercel não inclui os arquivos na função e a
  // leitura falha calada (o catch cai na face embutida / sem marca d'água).
  outputFileTracingIncludes: {
    "/api/cert/**": ["./public/fonts/**", "./public/logo_grasp.png"],
    "/api/verificar-certificado/**": [
      "./public/fonts/**",
      "./public/logo_grasp.png",
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// Upload de source maps só acontece quando SENTRY_AUTH_TOKEN existe (a
// integração Sentry↔Vercel define org/project/token); sem ele o build
// segue normal e os erros chegam sem stack desminificado.
// silent: false de propósito — o log de build da Vercel é onde se confere
// se o upload de source maps aconteceu.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: false,
});
