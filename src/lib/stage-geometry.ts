import {
  CERTIFICATE_HEIGHT,
  CERTIFICATE_WIDTH,
} from "@/lib/certificate-dimensions";

/** Distância, em px do certificado, para o campo grudar no centro. */
export const SNAP_TOLERANCE = 6;
export const CENTER_X = CERTIFICATE_WIDTH / 2;

export type StagePosition = { x: number; y: number; snapped: boolean };

function clamp(value: number, max: number): number {
  return Math.min(Math.max(Math.round(value), 0), max);
}

/**
 * Converte o arrasto do ponteiro em coordenadas do certificado.
 *
 * O palco é desenhado com `transform: scale(k)`, então o deslocamento do
 * ponteiro vem em px de tela e precisa ser dividido pela escala antes de virar
 * px do certificado — sem isso o campo anda mais devagar que o dedo em telas
 * estreitas. O resultado é preso ao canvas e arredondado, para não gravar
 * coordenada fracionária no JSON.
 */
export function dragToPosition({
  originX,
  originY,
  deltaScreenX,
  deltaScreenY,
  scale,
}: {
  originX: number;
  originY: number;
  deltaScreenX: number;
  deltaScreenY: number;
  scale: number;
}): StagePosition {
  const safeScale = scale > 0 ? scale : 1;

  let x = clamp(originX + deltaScreenX / safeScale, CERTIFICATE_WIDTH);
  const y = clamp(originY + deltaScreenY / safeScale, CERTIFICATE_HEIGHT);

  const snapped = Math.abs(x - CENTER_X) <= SNAP_TOLERANCE;
  if (snapped) x = CENTER_X;

  return { x, y, snapped };
}

/** Deslocamento por seta do teclado — 1 px, ou 10 px com Shift. */
export function nudgeToPosition(
  x: number,
  y: number,
  key: string,
  shift: boolean
): StagePosition | null {
  const step = shift ? 10 : 1;
  const deltas: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  };

  const delta = deltas[key];
  if (!delta) return null;

  return {
    x: clamp(x + delta[0], CERTIFICATE_WIDTH),
    y: clamp(y + delta[1], CERTIFICATE_HEIGHT),
    snapped: false,
  };
}
