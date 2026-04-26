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
