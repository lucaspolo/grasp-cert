"use client";

import { useEffect, useState } from "react";

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
  const [formatted, setFormatted] = useState<string>("");

  useEffect(() => {
    const d = new Date(date);
    if (showTime) {
      const dateTimeStr = d.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      });
      setFormatted(`${dateTimeStr} (${getUTCOffsetLabel(d)})`);
    } else {
      setFormatted(d.toLocaleDateString("pt-BR"));
    }
  }, [date, showTime]);

  // SSR fallback: render UTC date to avoid hydration mismatch
  if (!formatted) {
    const d = new Date(date);
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

  return (
    <time dateTime={new Date(date).toISOString()} suppressHydrationWarning>
      {formatted}
    </time>
  );
}
