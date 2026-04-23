"use client";

import { useState, useTransition } from "react";
import {
  uploadTemplateBg,
  saveTemplateConfig,
} from "@/app/actions/template";
import {
  getDefaultTemplateConfig,
  type TemplateConfig,
  type TemplateConfigField,
} from "@/lib/template-config";
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

const PREVIEW_WIDTH = 800;
const PREVIEW_HEIGHT = 500;

export function TemplateEditor({
  templateId,
  templateName,
  hasBgImage,
  initialConfig,
}: {
  templateId: string;
  templateName: string;
  hasBgImage: boolean;
  initialConfig: TemplateConfig | null;
}) {
  const [hasImage, setHasImage] = useState(hasBgImage);
  const [imageKey, setImageKey] = useState(0);
  const [config, setConfig] = useState<TemplateConfig>(
    initialConfig ?? getDefaultTemplateConfig()
  );
  const [uploading, startUpload] = useTransition();
  const [saving, startSave] = useTransition();

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
    value: string | number
  ) {
    setConfig((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [key]: { ...prev.fields[key], [prop]: value },
      },
    }));
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
      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Como criar a imagem de fundo</CardTitle>
          <CardDescription>
            Siga estas orientações para que o certificado fique com boa
            qualidade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Dimensões:</strong> mínimo{" "}
              <code className="text-foreground">800 × 500 px</code>, máximo{" "}
              <code className="text-foreground">1920 × 1200 px</code>.
            </li>
            <li>
              <strong>Formatos aceitos:</strong> PNG (recomendado), JPEG ou
              WebP. Tamanho máximo de 5 MB.
            </li>
            <li>
              <strong>Áreas de texto:</strong> deixe espaço livre (sem
              elementos visuais pesados) nas regiões onde os campos do
              certificado serão posicionados — você pode ajustar as coordenadas
              X/Y na seção &quot;Posição dos Campos&quot; abaixo.
            </li>
            <li>
              <strong>Contraste:</strong> escolha cores de fonte que contrastem
              com o fundo. Se o fundo for escuro, use cores claras nos campos;
              se for claro, use cores escuras.
            </li>
            <li>
              <strong>Elementos sugeridos:</strong> bordas decorativas, logo do
              evento/clube, título &quot;Certificado de Participação&quot; e
              qualquer arte fixa. Os dados variáveis (indicativo, nome, datas,
              QSO) serão sobrepostos automaticamente.
            </li>
            <li>
              <strong>Sem imagem?</strong> Sem problemas — um fundo padrão
              azul-escuro com borda dourada será utilizado.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Imagem de Fundo</CardTitle>
          <CardDescription>
            Envie uma imagem PNG, JPEG ou WebP (mín 800×500, máx 1920×1200, até 5MB).
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
          <CardTitle>Preview do Certificado</CardTitle>
          <CardDescription>
            Visualize como o certificado ficará com as posições configuradas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="relative border rounded-lg overflow-hidden mx-auto"
            style={{
              width: PREVIEW_WIDTH,
              height: PREVIEW_HEIGHT,
              background: bgImageUrl
                ? `url(${bgImageUrl}) center/cover`
                : "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
            }}
          >
            {/* Decorative border overlay when no custom bg */}
            {!bgImageUrl && (
              <div className="absolute inset-3 border-2 border-amber-400/40 rounded-lg" />
            )}

            {Object.entries(config.fields).map(([key, field]) => (
              <span
                key={key}
                className="absolute whitespace-nowrap font-bold"
                style={{
                  left: field.x,
                  top: field.y,
                  fontSize: field.fontSize,
                  color: field.color,
                  transform: "translateX(-50%)",
                  textShadow: bgImageUrl
                    ? "none"
                    : "0 1px 3px rgba(0,0,0,0.3)",
                }}
              >
                {key === "eventName" && templateName}
                {key === "participantCallsign" && "PY2ABC"}
                {key === "participantName" && "João da Silva"}
                {key === "eventDate" && "01/01/2026 — 02/01/2026"}
                {key === "qsoInfo" && "14.250 MHz · SSB · RST 59/59"}
                {key === "qsoDateTime" && "01/01/2026 14:30 UTC"}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Config fields */}
      <Card>
        <CardHeader>
          <CardTitle>Posição dos Campos</CardTitle>
          <CardDescription>
            Configure a posição (X, Y), tamanho da fonte e cor para cada campo
            do certificado. O preview acima reflete as alterações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(config.fields).map(([key, field]) => (
              <div
                key={key}
                className="grid grid-cols-5 gap-3 items-end border-b pb-3"
              >
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {field.label}
                  </Label>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">X</Label>
                  <Input
                    type="number"
                    value={field.x}
                    onChange={(e) =>
                      updateField(key, "x", Number(e.target.value))
                    }
                    min={0}
                    max={PREVIEW_WIDTH}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Y</Label>
                  <Input
                    type="number"
                    value={field.y}
                    onChange={(e) =>
                      updateField(key, "y", Number(e.target.value))
                    }
                    min={0}
                    max={PREVIEW_HEIGHT}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fonte</Label>
                  <Input
                    type="number"
                    value={field.fontSize}
                    onChange={(e) =>
                      updateField(key, "fontSize", Number(e.target.value))
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
