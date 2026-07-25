import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";

import { scrubSentryEvent } from "./sentry-scrub";

describe("scrubSentryEvent", () => {
  it("remove cookies, corpo de request e cabeçalhos sensíveis", () => {
    const event = {
      request: {
        cookies: { "authjs.session-token": "jwt..." },
        data: { password: "hunter22", otp: "123456" },
        headers: {
          authorization: "Bearer abc",
          "user-agent": "Mozilla/5.0",
        },
      },
    } as unknown as ErrorEvent;

    const scrubbed = scrubSentryEvent(event);

    expect(scrubbed.request?.cookies).toBeUndefined();
    expect(scrubbed.request?.data).toBeUndefined();
    expect(scrubbed.request?.headers?.authorization).toBe("[redacted]");
    expect(scrubbed.request?.headers?.["user-agent"]).toBe("Mozilla/5.0");
  });

  it("redige chaves sensíveis aninhadas em extra/contexts", () => {
    const event = {
      extra: { form: { senha: "abc", confirmPassword: "abc", nome: "Fulano" } },
      contexts: { state: { totpSecret: "JBSW..." } },
    } as unknown as ErrorEvent;

    const scrubbed = scrubSentryEvent(event);
    const form = (scrubbed.extra as Record<string, Record<string, unknown>>).form;

    expect(form.senha).toBe("[redacted]");
    expect(form.confirmPassword).toBe("[redacted]");
    expect(form.nome).toBe("Fulano");
    expect(
      (scrubbed.contexts as Record<string, Record<string, unknown>>).state
        .totpSecret
    ).toBe("[redacted]");
  });

  it("mantém eventos sem request/extra intactos", () => {
    const event = { message: "boom" } as unknown as ErrorEvent;
    expect(scrubSentryEvent(event)).toBe(event);
  });
});
