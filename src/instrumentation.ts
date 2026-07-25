import * as Sentry from "@sentry/nextjs";

// Convenção do Next 16: register() roda uma vez por instância do servidor.
// A env NEXT_RUNTIME distingue Node do Edge (ver guia de instrumentation
// em node_modules/next/dist/docs).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Captura erros de Server Components, Server Actions e route handlers.
export const onRequestError = Sentry.captureRequestError;
