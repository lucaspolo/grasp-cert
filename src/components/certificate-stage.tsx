// Sem "use client": este módulo só é importado pelo editor, que já está do
// lado do cliente. Marcá-lo como fronteira faria o Next exigir props
// serializáveis, e o palco recebe callbacks.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CertificateCanvas } from "@/lib/certificate-canvas";
import {
  CERTIFICATE_HEIGHT,
  CERTIFICATE_WIDTH,
} from "@/lib/certificate-dimensions";
import type { TemplateConfig } from "@/lib/template-config";
import {
  CENTER_X,
  dragToPosition,
  nudgeToPosition,
} from "@/lib/stage-geometry";

type Box = { left: number; top: number; width: number; height: number };

/**
 * Palco de edição: desenha o certificado com o componente compartilhado e põe
 * por cima um overlay de alvos arrastáveis. Toda a decoração de edição (anel de
 * seleção, guia de centro) vive no overlay — o desenho do certificado nunca
 * recebe classe nem estado de edição.
 */
export function CertificateStage({
  config,
  values,
  badge,
  verifyUrl,
  bgSrc,
  qrSrc,
  selected,
  onSelect,
  onMove,
  onBeginChange,
  onMeasure,
}: {
  config: TemplateConfig;
  values: Record<string, string>;
  badge: string;
  verifyUrl: string;
  bgSrc: string | null;
  qrSrc: string;
  selected: string | null;
  onSelect: (key: string | null) => void;
  onMove: (key: string, x: number, y: number) => void;
  /** Chamado antes de cada alteração, para o desfazer guardar o estado. */
  onBeginChange: () => void;
  /** Largura de cada campo em px do certificado — usada ao trocar a âncora. */
  onMeasure: (widths: Record<string, number>) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const [snapped, setSnapped] = useState(false);
  const dragRef = useRef<{
    key: string;
    pointerX: number;
    pointerY: number;
    originX: number;
    originY: number;
  } | null>(null);

  // A coluna é medida no wrapper; o palco em si tem exatamente o tamanho do
  // certificado, senão as caixas de seleção transbordam para fora do papel.
  //
  // A primeira medição é em layout effect, antes do paint: em useEffect o palco
  // aparecia em 800px e encolhia um quadro depois, em telas estreitas.
  useLayoutEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;

    const fit = (width: number) =>
      setScale(Math.min(1, width / CERTIFICATE_WIDTH));

    fit(node.getBoundingClientRect().width);

    const observer = new ResizeObserver(([entry]) => fit(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /**
   * As caixas do overlay saem do DOM real do certificado, então acompanham o
   * texto de verdade. Precisa re-medir a cada mudança de config (o texto anda
   * durante o arrasto) e quando a fonte termina de carregar, que muda a métrica.
   */
  const measure = useCallback(() => {
    const node = stageRef.current;
    if (!node) return;

    const stageRect = node.getBoundingClientRect();
    const next: Record<string, Box> = {};
    const widths: Record<string, number> = {};
    const currentScale = stageRect.width / CERTIFICATE_WIDTH || 1;

    node.querySelectorAll<HTMLElement>("[data-field]").forEach((el) => {
      const key = el.dataset.field;
      if (!key) return;
      const rect = el.getBoundingClientRect();
      next[key] = {
        left: rect.left - stageRect.left,
        top: rect.top - stageRect.top,
        width: rect.width,
        height: rect.height,
      };
      // Em px do certificado, para servir de entrada ao reancorar.
      widths[key] = rect.width / currentScale;
    });

    setBoxes(next);
    onMeasure(widths);
  }, [onMeasure]);

  useLayoutEffect(() => {
    measure();
  }, [measure, config, values, scale, bgSrc]);

  useEffect(() => {
    document.fonts?.ready.then(measure).catch(() => {});
  }, [measure]);

  function handlePointerDown(event: React.PointerEvent, key: string) {
    event.preventDefault();
    onSelect(key);
    onBeginChange();

    const field = config.fields[key];
    dragRef.current = {
      key,
      pointerX: event.clientX,
      pointerY: event.clientY,
      originX: field.x,
      originY: field.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;

    const next = dragToPosition({
      originX: drag.originX,
      originY: drag.originY,
      deltaScreenX: event.clientX - drag.pointerX,
      deltaScreenY: event.clientY - drag.pointerY,
      scale,
    });

    setSnapped(next.snapped);
    onMove(drag.key, next.x, next.y);
  }

  function handlePointerUp(event: React.PointerEvent) {
    if (!dragRef.current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setSnapped(false);
  }

  function handleKeyDown(event: React.KeyboardEvent, key: string) {
    const field = config.fields[key];
    const next = nudgeToPosition(field.x, field.y, event.key, event.shiftKey);
    if (!next) return;

    event.preventDefault();
    onBeginChange();
    onMove(key, next.x, next.y);
  }

  return (
    <div ref={wrapperRef} className="w-full">
    <div
      ref={stageRef}
      className="relative mx-auto touch-none overflow-hidden rounded-lg border select-none"
      style={{
        width: CERTIFICATE_WIDTH * scale,
        height: CERTIFICATE_HEIGHT * scale,
      }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
    >
      <CertificateCanvas
        config={config}
        values={values}
        badge={badge}
        verifyUrl={verifyUrl}
        bgSrc={bgSrc}
        qrSrc={qrSrc}
        scale={scale}
      />

      {/* Âncora do campo selecionado: o ponto do texto que fica no x. É o único
          retorno visual de trocar o alinhamento, já que a troca reposiciona o x
          justamente para o texto não sair do lugar. */}
      {selected && boxes[selected] && (
        <div
          className="pointer-events-none absolute flex flex-col items-center"
          style={{
            left: (config.fields[selected]?.x ?? 0) * scale - 4,
            top: boxes[selected].top - 10,
          }}
        >
          <div className="size-2 rotate-45 bg-amber-500" />
          <div
            className="w-px bg-amber-500"
            style={{ height: boxes[selected].height + 10 }}
          />
        </div>
      )}

      {/* Guia do centro, durante o encaixe */}
      {snapped && (
        <div
          className="pointer-events-none absolute top-0 bottom-0 border-l-2 border-dashed border-sky-500"
          style={{ left: CENTER_X * scale }}
        />
      )}

      {/* Alvos de arrasto — um por campo desenhado */}
      {Object.entries(boxes).map(([key, box]) => (
        <button
          key={key}
          type="button"
          aria-label={`Mover ${config.fields[key]?.label ?? key}`}
          onPointerDown={(e) => handlePointerDown(e, key)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={(e) => handleKeyDown(e, key)}
          className={`absolute cursor-move rounded-sm transition-colors ${
            selected === key
              ? "ring-2 ring-sky-500 bg-sky-500/10"
              : "hover:bg-sky-500/10 hover:ring-1 hover:ring-sky-400/60"
          }`}
          style={{
            left: box.left - 4,
            top: box.top - 2,
            width: box.width + 8,
            height: box.height + 4,
          }}
        />
      ))}
    </div>
    </div>
  );
}
