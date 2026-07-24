"use client";

import { useMounted } from "@/lib/use-mounted";

type LocalDateTimeProps = {
  date: string | Date;
  showTime?: boolean;
};

function getUTCOffsetLabel(date: Date): string {
  const offsetMin = date.getTimezoneOffset();
  const sign = offsetMin <= 0 ? "+" : "-";
  const absHours = Math.floor(Math.abs(offsetMin) / 60);
  const absMinutes = Math.abs(offsetMin) % 60;
  const h = String(absHours).padStart(2, "0");
  if (absMinutes === 0) return `UTC${sign}${h}`;
  const m = String(absMinutes).padStart(2, "0");
  return `UTC${sign}${h}:${m}`;
}

export function LocalDateTime({ date, showTime = false }: LocalDateTimeProps) {
  const mounted = useMounted();
  const d = new Date(date);

  // SSR fallback: render UTC date to avoid hydration mismatch
  if (!mounted) {
    if (showTime) {
      return (
        <time dateTime={d.toISOString()} suppressHydrationWarning>
          {d.toLocaleString("pt-BR", { timeZone: "UTC", dateStyle: "short", timeStyle: "short" })} (UTC+00)
        </time>
      );
    }
    return (
      <time dateTime={d.toISOString()} suppressHydrationWarning>
        {d.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
      </time>
    );
  }

  const formatted = showTime
    ? `${d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} (${getUTCOffsetLabel(d)})`
    : d.toLocaleDateString("pt-BR");

  return (
    <time dateTime={d.toISOString()} suppressHydrationWarning>
      {formatted}
    </time>
  );
}
