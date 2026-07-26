"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  uploadTemplateBg,
  saveTemplateConfig,
} from "@/app/actions/template";
import {
  getDefaultTemplateConfig,
  type TemplateConfig,
  type TemplateConfigField,
} from "@/lib/template-config";
import {
  CERTIFICATE_HEIGHT,
  CERTIFICATE_WIDTH,
} from "@/lib/certificate-dimensions";
import { CertificateCanvas } from "@/lib/certificate-canvas";
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
import { toast } from "sonner";

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
  const [config, setConfig] = useState<TemplateConfig>(
    initialConfig ?? getDefaultTemplateConfig()
  );
  const [kind, setKind] = useState<CertificateKind>("participant");
  const [uploading, startUpload] = useTransition();
  const [saving, startSave] = useTransition();

  // O certificado tem 800px fixos; o palco encolhe junto com a coluna.
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / CERTIFICATE_WIDTH));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const bgImageUrl = hasImage
    ? `/api/templates/${templateId}/image?v=${imageKey}`
    : null;

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

  function updateField(
    key: string,
    prop: keyof TemplateConfigField,
    value: string | number | boolean
  ) {
    setConfig((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [key]: { ...prev.fields[key], [prop]: value },
      },
    }));
  }

  /** Campo vazio vira 0 no Number(), o que teleporta o campo a cada tecla. */
  function updateCoord(key: string, prop: "x" | "y" | "fontSize", raw: string) {
    if (raw === "") return;
    const max =
      prop === "x"
        ? CERTIFICATE_WIDTH
        : prop === "y"
          ? CERTIFICATE_HEIGHT
          : 120;
    const min = prop === "fontSize" ? 8 : 0;
    updateField(key, prop, Math.min(Math.max(Number(raw), min), max));
  }

  function handleSave() {
    startSave(async () => {
      const result = await saveTemplateConfig(templateId, config);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Configuração salva.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Upload */}
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

      {/* Preview */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Preview do Certificado</CardTitle>
              <CardDescription>
                Este é o mesmo desenho que gera o PNG e o PDF — o que aparece
                aqui é o que sai no certificado.
              </CardDescription>
            </div>
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
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={stageRef}
            className="relative mx-auto w-full overflow-hidden rounded-lg border"
            style={{ height: CERTIFICATE_HEIGHT * scale }}
          >
            <CertificateCanvas
              config={config}
              values={sampleCertificateValues(kind)}
              badge={SAMPLE_BADGE[kind]}
              verifyUrl={SAMPLE_VERIFY_URL}
              bgSrc={bgImageUrl}
              qrSrc={qrSrc}
              watermarkSrc="/logo_grasp.png"
              scale={scale}
            />
          </div>
        </CardContent>
      </Card>

      {/* Config fields */}
      <Card>
        <CardHeader>
          <CardTitle>Posição dos Campos</CardTitle>
          <CardDescription>
            X e Y em pixels dentro do certificado de {CERTIFICATE_WIDTH}×
            {CERTIFICATE_HEIGHT}. Campos centralizados usam o X como centro do
            texto; o número de série é alinhado pela esquerda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(config.fields).map(([key, field]) => (
              <div
                key={key}
                className="grid grid-cols-2 items-end gap-3 border-b pb-3 sm:grid-cols-6"
              >
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-xs text-muted-foreground">
                    {field.label}
                  </Label>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">X</Label>
                  <Input
                    type="number"
                    value={field.x}
                    onChange={(e) => updateCoord(key, "x", e.target.value)}
                    min={0}
                    max={CERTIFICATE_WIDTH}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Y</Label>
                  <Input
                    type="number"
                    value={field.y}
                    onChange={(e) => updateCoord(key, "y", e.target.value)}
                    min={0}
                    max={CERTIFICATE_HEIGHT}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fonte</Label>
                  <Input
                    type="number"
                    value={field.fontSize}
                    onChange={(e) =>
                      updateCoord(key, "fontSize", e.target.value)
                    }
                    min={8}
                    max={120}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cor</Label>
                  <Input
                    type="color"
                    value={field.color}
                    onChange={(e) => updateField(key, "color", e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={field.visible !== false}
                    onChange={(e) =>
                      updateField(key, "visible", e.target.checked)
                    }
                  />
                  Mostrar
                </label>
              </div>
            ))}
          </div>

          <Button onClick={handleSave} disabled={saving} className="mt-4">
            {saving ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
