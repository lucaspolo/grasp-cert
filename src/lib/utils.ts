import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse "DD/MM/YYYY HH:mm" (Brazilian) or "YYYY-MM-DDTHH:mm" (ISO) into a Date.
 * Returns null when the input is invalid.
 */
export function parseBRDateTime(value: string): Date | null {
  // ISO-like (backwards compat with datetime-local values)
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(value)) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // Brazilian: DD/MM/YYYY HH:mm
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!m) return null;

  const [, day, month, year, hour, minute] = m;
  const d = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a Date into "DD/MM/YYYY HH:mm".
 */
export function formatBRDateTime(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

/**
 * Convert a Date (interpreted as local time in the given timezone) to UTC.
 * E.g., if date represents "2026-05-01 14:00" in "America/Sao_Paulo" (UTC-3),
 * the result is a Date for "2026-05-01 17:00 UTC".
 */
export function localToUTC(date: Date, timezone: string): Date {
  // Format the date parts in the target timezone to find its UTC offset
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Get what "now" looks like in that timezone to calculate offset
  const localStr = formatter.format(date);
  const localParsed = new Date(localStr);
  const offsetMs = localParsed.getTime() - date.getTime();

  return new Date(date.getTime() - offsetMs);
}

/**
 * Convert a UTC Date to the equivalent local time in the given timezone,
 * formatted as "DD/MM/YYYY HH:mm".
 */
export function formatBRDateTimeInTZ(date: Date, timezone: string): string {
  const d = new Date(date);
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}
