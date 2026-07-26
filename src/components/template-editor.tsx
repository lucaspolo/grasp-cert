"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { uploadTemplateBg, saveTemplateConfig } from "@/app/actions/template";
import {
  type TemplateConfig,
  type TemplateConfigField,
  type TemplateFieldAlign,
} from "@/lib/template-config";
import {
  CERTIFICATE_HEIGHT,
  CERTIFICATE_WIDTH,
} from "@/lib/certificate-dimensions";
import { CertificateStage } from "@/components/certificate-stage";
import { realignX } from "@/lib/stage-geometry";
import {
  SAMPLE_BADGE,
  SAMPLE_VERIFY_URL,
  sampleCertificateValues,
} from "@/lib/certificate-sample";
import type { CertificateKind } from "@/lib/certificate-kind";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff, Undo2 } from "lucide-react";
import { toast } from "sonner";

const ALIGN_OPTIONS: { value: TemplateFieldAlign; label: string }[] =
  [
    { value: "left", label: "Esquerda" },
    { value: "center", label: "Centro" },
    { value: "right", label: "Direita" },
  ];

export function TemplateEditor({
  templateId,
  hasBgImage,
  initialConfig,
  qrSrc,
}: {
  templateId: string;
  hasBgImage: boolean;
  initialConfig: TemplateConfig;
  /** QR de exemplo, gerado no servidor para o qrcode não entrar no bundle. */
  qrSrc: string;
}) {
  const [hasImage, setHasImage] = useState(hasBgImage);
  const [imageKey, setImageKey] = useState(0);
  const [config, setConfig] = useState<TemplateConfig>(initialConfig);
  const [kind, setKind] = useState<CertificateKind>("participant");
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<TemplateConfig[]>([]);
  const [dirty, setDirty] = useState(false);
  const [uploading, startUpload] = useTransition();
  const [saving, startSave] = useTransition();

  // Largura medida de cada campo, em px do certificado. Fica em ref porque só é
  // lida sob demanda — em estado, cada medição dispararia outro render.
  const widthsRef = useRef<Record<string, number>>({});
  const handleMeasure = useCallback((widths: Record<string, number>) => {
    widthsRef.current = widths;
  }, []);

  const values = useMemo(() => sampleCertificateValues(kind), [kind]);
  const bgImageUrl = hasImage
    ? `/api/templates/${templateId}/image?v=${imageKey}`
    : null;

  // Fechar a aba com alteração pendente perde tudo em silêncio.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /** Guarda o estado atual para o desfazer. Um snapshot por gesto. */
  const beginChange = useCallback(() => {
    setHistory((prev) => [...prev.slice(-49), config]);
    setDirty(true);
  }, [config]);

  function undo() {
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last) setConfig(last);
      return prev.slice(0, -1);
    });
  }

  const moveField = useCallback((key: string, x: number, y: number) => {
    setConfig((prev) => ({
      ...prev,
      fields: { ...prev.fields, [key]: { ...prev.fields[key], x, y } },
    }));
  }, []);

  function updateField(
    key: string,
    prop: keyof TemplateConfigField,
    value: string | number | boolean
  ) {
    beginChange();
    setConfig((prev) => ({
      ...prev,
      fields: { ...prev.fields, [key]: { ...prev.fields[key], [prop]: value } },
    }));
  }

  /**
   * Trocar a âncora sem reancorar o x fazia o campo saltar: um texto
   * centralizado em 400 virava um texto que começa em 400 e transborda.
   */
  function changeAlign(key: string, align: TemplateFieldAlign) {
    const field = config.fields[key];
    const x = realignX(
      field.x,
      widthsRef.current[key] ?? 0,
      field.align ?? "center",
      align
    );

    beginChange();
    setConfig((prev) => ({
      ...prev,
      fields: { ...prev.fields, [key]: { ...prev.fields[key], align, x } },
    }));
  }

  /** Campo vazio vira 0 no Number(), o que teleporta o campo a cada tecla. */
  function updateNumber(
    key: string,
    prop: "x" | "y" | "fontSize",
    raw: string
  ) {
    if (raw === "") return;
    const max =
      prop === "x" ? CERTIFICATE_WIDTH : prop === "y" ? CERTIFICATE_HEIGHT : 120;
    const min = prop === "fontSize" ? 8 : 0;
    updateField(key, prop, Math.min(Math.max(Number(raw), min), max));
  }

  function handleUpload(formData: FormData) {
    startUpload(async () => {
      const result = await uploadTemplateBg(templateId, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        setHasImage(true);
        setImageKey((k) => k + 1);
        toast.success("Imagem enviada com sucesso.");
      }
    });
  }

  function handleSave() {
    startSave(async () => {
      const result = await saveTemplateConfig(templateId, config);
      if (result.error) {
        toast.error(result.error);
      } else {
        setDirty(false);
        toast.success("Layout salvo.");
      }
    });
  }

  const selectedField = selected ? config.fields[selected] : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Imagem de Fundo</CardTitle>
          <CardDescription>
            PNG, JPEG ou WebP — mínimo 800×500, máximo 1920×1200, até 5 MB. Sem
            imagem, o certificado usa o fundo amarelo padrão com selo, borda e
            marca d&apos;água; com imagem, esses elementos dão lugar à sua arte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleUpload} className="flex items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="file">Arquivo</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
              />
            </div>
            <Button type="submit" disabled={uploading}>
              {uploading ? "Enviando..." : "Enviar"}
            </Button>
          </form>
          {hasImage && (
            <p className="mt-2 text-sm text-muted-foreground">
              ✓ Imagem de fundo configurada.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Layout do Certificado</CardTitle>
              <CardDescription>
                Arraste os campos direto no certificado. Este é o mesmo desenho
                que gera o PNG e o PDF.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 rounded-md border p-1">
                {(["participant", "operator"] as const).map((k) => (
                  <Button
                    key={k}
                    type="button"
                    size="sm"
                    variant={kind === k ? "secondary" : "ghost"}
                    onClick={() => setKind(k)}
                  >
                    {k === "participant" ? "Participante" : "Operador"}
                  </Button>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={undo}
                disabled={history.length === 0}
              >
                <Undo2 className="size-4" />
                Desfazer
              </Button>
              <Button onClick={handleSave} disabled={saving || !dirty} size="sm">
                {saving ? "Salvando..." : dirty ? "Salvar" : "Salvo"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <CertificateStage
              config={config}
              values={values}
              badge={SAMPLE_BADGE[kind]}
              verifyUrl={SAMPLE_VERIFY_URL}
              bgSrc={bgImageUrl}
              qrSrc={qrSrc}
              watermarkSrc="/logo_grasp.png"
              selected={selected}
              onSelect={setSelected}
              onMove={moveField}
              onBeginChange={beginChange}
              onMeasure={handleMeasure}
            />

            <div className="space-y-4">
              {/* Lista de campos: também é como se alcança um campo escondido
                  ou pequeno demais para clicar no palco. */}
              <div className="space-y-1">
                {Object.entries(config.fields).map(([key, field]) => (
                  <div
                    key={key}
                    className={`flex items-center gap-1 rounded-md border px-2 py-1 text-sm ${
                      selected === key ? "border-sky-500 bg-sky-500/5" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(key)}
                      className="flex-1 truncate text-left"
                    >
                      {field.label}
                    </button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={
                        field.visible === false
                          ? `Mostrar ${field.label}`
                          : `Ocultar ${field.label}`
                      }
                      onClick={() =>
                        updateField(key, "visible", field.visible === false)
                      }
                    >
                      {field.visible === false ? (
                        <EyeOff className="size-4 text-muted-foreground" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>

              {/* Ajuste fino do campo selecionado */}
              {selected && selectedField ? (
                <div className="space-y-3 rounded-md border p-3">
                  <p className="text-sm font-medium">{selectedField.label}</p>

                  {selectedField.visible === false && (
                    <p className="text-xs text-muted-foreground">
                      Oculto — não sai no certificado.
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">X</Label>
                      <Input
                        type="number"
                        value={selectedField.x}
                        min={0}
                        max={CERTIFICATE_WIDTH}
                        onChange={(e) =>
                          updateNumber(selected, "x", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Y</Label>
                      <Input
                        type="number"
                        value={selectedField.y}
                        min={0}
                        max={CERTIFICATE_HEIGHT}
                        onChange={(e) =>
                          updateNumber(selected, "y", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fonte</Label>
                      <Input
                        type="number"
                        value={selectedField.fontSize}
                        min={8}
                        max={120}
                        onChange={(e) =>
                          updateNumber(selected, "fontSize", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cor</Label>
                      <Input
                        type="color"
                        value={selectedField.color}
                        onChange={(e) =>
                          updateField(selected, "color", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Alinhamento</Label>
                    <div className="flex gap-1">
                      {ALIGN_OPTIONS.map((option) => (
                        <Button
                          key={option.value}
                          type="button"
                          size="sm"
                          className="flex-1"
                          variant={
                            (selectedField.align ?? "center") === option.value
                              ? "secondary"
                              : "ghost"
                          }
                          onClick={() => changeAlign(selected, option.value)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Setas movem 1 px, com Shift movem 10 px. O campo gruda no
                    centro do certificado.
                  </p>
                </div>
              ) : (
                <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  Clique num campo do certificado, ou na lista acima, para
                  ajustá-lo.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
