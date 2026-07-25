/**
 * Helpers puros para o seletor de data/hora (`datetime-input.tsx`).
 * Extraídos para permitir teste isolado das regras que causavam bugs:
 * hora virando "020" e o seletor sobrescrevendo a hora já digitada.
 */

/**
 * Sanitiza um trecho de hora/minuto **durante a digitação**: mantém só
 * dígitos, no máximo 2, e limita ao máximo (23 para hora, 59 para minuto).
 * Preserva zeros à esquerda digitados ("02") e permite string vazia enquanto
 * o campo está sendo editado. É o que impede "20" de virar "020".
 */
export function clampTimePart(raw: string, max: number): string {
  const digits = raw.replace(/\D/g, "").slice(0, 2);
  if (digits === "") return "";
  if (Number(digits) > max) return String(max);
  return digits;
}

/** Normaliza para 2 dígitos na hora de compor o valor final ("" → "00"). */
export function padTimePart(part: string): string {
  if (part === "") return "00";
  return part.padStart(2, "0");
}

export type MaskedParts = {
  /** "dd/MM/yyyy" quando os 8 dígitos da data estão presentes; senão "". */
  dateStr: string;
  hh: string;
  mm: string;
};

/**
 * Quebra o valor mascarado ("DD/MM/AAAA HH:mm", com "_" nos vazios) em partes.
 * Usado ao abrir o seletor para semeá-lo com o que já está digitado — sem
 * isso, o seletor mostrava sempre 00:00 e sobrescrevia a hora ao confirmar.
 */
export function splitMaskedDateTime(masked: string): MaskedParts {
  const dateMatch = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(masked);
  const timeMatch = /(\d{2}):(\d{2})/.exec(masked);
  return {
    dateStr: dateMatch
      ? `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`
      : "",
    hh: timeMatch ? timeMatch[1] : "00",
    mm: timeMatch ? timeMatch[2] : "00",
  };
}

/** Compõe o valor final "DD/MM/YYYY HH:mm" (formato que o server espera). */
export function composeMaskedDateTime(
  dateStr: string,
  hh: string,
  mm: string
): string {
  return `${dateStr} ${padTimePart(hh)}:${padTimePart(mm)}`;
}
