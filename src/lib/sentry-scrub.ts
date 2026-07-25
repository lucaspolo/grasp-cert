import type { ErrorEvent } from "@sentry/nextjs";

/** Campos que nunca podem chegar ao Sentry, onde quer que apareçam. */
const SENSITIVE_KEYS = /senha|password|otp|secret|token|authorization|cookie/i;

function scrubObject(obj: unknown): void {
  if (!obj || typeof obj !== "object") return;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.test(key)) {
      (obj as Record<string, unknown>)[key] = "[redacted]";
    } else if (value && typeof value === "object") {
      scrubObject(value);
    }
  }
}

/**
 * beforeSend compartilhado (server/edge/client): remove credenciais e
 * segredos do evento — cabeçalhos, cookies, dados de request e extras.
 * O SDK não captura valores de formulário por padrão; isto é a rede de
 * segurança para o que passar por outros caminhos.
 */
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    scrubObject(event.request.headers);
  }
  scrubObject(event.extra);
  scrubObject(event.contexts);
  scrubObject(event.breadcrumbs);
  return event;
}
