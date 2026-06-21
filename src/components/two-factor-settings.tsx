"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  confirmTwoFactorSetup,
  disableTwoFactor,
  getTwoFactorStatus,
  regenerateRecoveryCodes,
  revokeTrustedDevices,
  startTwoFactorSetup,
  type TwoFactorStatus,
} from "@/app/actions/two-factor";

type Phase = "idle" | "setup" | "recovery";

function RecoveryCodes({ codes }: { codes: string[] }) {
  function copyAll() {
    navigator.clipboard.writeText(codes.join("\n"));
    toast.success("Códigos copiados.");
  }

  return (
    <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
        Guarde estes códigos de recuperação em local seguro. Cada um pode ser
        usado uma única vez caso você perca acesso ao aplicativo autenticador.
        Eles não serão exibidos novamente.
      </p>
      <div className="grid grid-cols-2 gap-2 font-mono text-sm">
        {codes.map((code) => (
          <span key={code} className="rounded bg-background px-2 py-1 text-center">
            {code}
          </span>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={copyAll}>
        Copiar códigos
      </Button>
    </div>
  );
}

export function TwoFactorSettings() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [pending, startTransition] = useTransition();

  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const [disableCode, setDisableCode] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [regenCode, setRegenCode] = useState("");
  const [showRegen, setShowRegen] = useState(false);

  async function refresh() {
    const data = await getTwoFactorStatus();
    setStatus(data);
    setLoading(false);
  }

  useEffect(() => {
    getTwoFactorStatus().then((data) => {
      setStatus(data);
      setLoading(false);
    });
  }, []);

  function handleStart() {
    startTransition(async () => {
      const result = await startTwoFactorSetup();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setQrDataUrl(result.qrDataUrl);
      setSecret(result.secret);
      setSetupCode("");
      setPhase("setup");
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmTwoFactorSetup(setupCode);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setRecoveryCodes(result.recoveryCodes);
      setPhase("recovery");
      toast.success("Autenticação de dois fatores ativada.");
      await refresh();
    });
  }

  function handleFinish() {
    setPhase("idle");
    setRecoveryCodes([]);
    setSecret("");
    setQrDataUrl("");
  }

  function handleDisable() {
    startTransition(async () => {
      const result = await disableTwoFactor(disableCode);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Autenticação de dois fatores desativada.");
      setShowDisable(false);
      setDisableCode("");
      await refresh();
    });
  }

  function handleRegenerate() {
    startTransition(async () => {
      const result = await regenerateRecoveryCodes(regenCode);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setRecoveryCodes(result.recoveryCodes);
      setPhase("recovery");
      setShowRegen(false);
      setRegenCode("");
      toast.success("Novos códigos de recuperação gerados.");
    });
  }

  function handleRevokeDevices() {
    startTransition(async () => {
      const result = await revokeTrustedDevices();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Dispositivos confiáveis revogados.");
      await refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Autenticação de dois fatores</CardTitle>
          {status?.enabled && <Badge variant="secondary">Ativa</Badge>}
        </div>
        <CardDescription>
          Adicione uma camada extra de segurança usando um aplicativo
          autenticador (Google Authenticator, Authy, etc.).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {!loading && phase === "recovery" && (
          <div className="space-y-4">
            <RecoveryCodes codes={recoveryCodes} />
            <Button type="button" onClick={handleFinish}>
              Concluir
            </Button>
          </div>
        )}

        {!loading && phase === "setup" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              1. Escaneie o QR Code abaixo no seu aplicativo autenticador.
            </p>
            {qrDataUrl && (
              <Image
                src={qrDataUrl}
                alt="QR Code para configuração do 2FA"
                width={200}
                height={200}
                unoptimized
                className="rounded-md border bg-white p-2"
              />
            )}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Ou insira manualmente esta chave:
              </p>
              <code className="block break-all rounded bg-muted px-2 py-1 font-mono text-xs">
                {secret}
              </code>
            </div>
            <div className="space-y-2">
              <Label htmlFor="setupCode">
                2. Digite o código de 6 dígitos gerado
              </Label>
              <Input
                id="setupCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                value={setupCode}
                onChange={(e) =>
                  setSetupCode(e.target.value.replace(/\D/g, ""))
                }
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={pending || setupCode.length !== 6}
              >
                {pending ? "Confirmando..." : "Ativar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleFinish}
                disabled={pending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {!loading && phase === "idle" && !status?.enabled && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              A autenticação de dois fatores está desativada.
            </p>
            <Button type="button" onClick={handleStart} disabled={pending}>
              {pending ? "Preparando..." : "Ativar 2FA"}
            </Button>
          </div>
        )}

        {!loading && phase === "idle" && status?.enabled && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {status.trustedDevices > 0
                ? `Você tem ${status.trustedDevices} dispositivo(s) confiável(is) que não pedem código por 30 dias.`
                : "Nenhum dispositivo confiável no momento."}
            </p>

            {status.trustedDevices > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRevokeDevices}
                disabled={pending}
              >
                Revogar dispositivos confiáveis
              </Button>
            )}

            <hr />

            {!showRegen ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRegen(true)}
              >
                Gerar novos códigos de recuperação
              </Button>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="regenCode">
                  Confirme com um código do autenticador ou de recuperação
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="regenCode"
                    autoComplete="one-time-code"
                    placeholder="Código"
                    value={regenCode}
                    onChange={(e) => setRegenCode(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={pending || !regenCode}
                  >
                    Gerar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowRegen(false);
                      setRegenCode("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            <hr />

            {!showDisable ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setShowDisable(true)}
              >
                Desativar 2FA
              </Button>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="disableCode">
                  Para desativar, confirme com um código do autenticador ou de
                  recuperação
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="disableCode"
                    autoComplete="one-time-code"
                    placeholder="Código"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDisable}
                    disabled={pending || !disableCode}
                  >
                    Desativar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowDisable(false);
                      setDisableCode("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
