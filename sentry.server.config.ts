import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/sentry-scrub";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Só em produção: em dev os erros aparecem no terminal e poluiriam a cota.
  enabled: process.env.NODE_ENV === "production",
  // Apenas erros — sem tracing, para caber com folga no plano gratuito.
  tracesSampleRate: 0,
  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
});
