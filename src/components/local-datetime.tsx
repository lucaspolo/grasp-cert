"use client";

import { useEffect, useState } from "react";

type LocalDateTimeProps = {
  date: string | Date;
  showTime?: boolean;
};

export function LocalDateTime({ date, showTime = false }: LocalDateTimeProps) {
  const [formatted, setFormatted] = useState<string>("");

  useEffect(() => {
    const d = new Date(date);
    if (showTime) {
      setFormatted(
        d.toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        })
      );
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
          {d.toLocaleString("pt-BR", { timeZone: "UTC", dateStyle: "short", timeStyle: "short" })}
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
