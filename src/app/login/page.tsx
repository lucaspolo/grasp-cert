"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
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
import Link from "next/link";
import { trustCurrentDevice } from "@/app/actions/two-factor";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");

  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [callsign, setCallsign] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [remember, setRemember] = useState(false);

  async function finishLogin() {
    if (remember) {
      try {
        await trustCurrentDevice();
      } catch {
        // Confiar no dispositivo é opcional: nunca deve bloquear o login.
      }
    }
    router.push("/");
    router.refresh();
  }

  async function handleCredentialsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        callsign: callsign.toUpperCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.code === "TWO_FACTOR_REQUIRED") {
          setStep("otp");
          setError("");
        } else if (result.code === "EMAIL_NOT_VERIFIED") {
          setError("E-mail não verificado. Verifique sua caixa de entrada para ativar sua conta.");
        } else {
          setError("Indicativo ou senha inválidos");
        }
        setPending(false);
      } else {
        await finishLogin();
      }
    } catch {
      setError("Não foi possível concluir o login. Tente novamente.");
      setPending(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        callsign: callsign.toUpperCase(),
        password,
        otp,
        redirect: false,
      });

      if (result?.error) {
        if (result.code === "INVALID_2FA") {
          setError("Código de verificação inválido. Tente novamente.");
        } else {
          setError("Não foi possível concluir o login. Tente novamente.");
        }
        setPending(false);
      } else {
        await finishLogin();
      }
    } catch {
      setError("Não foi possível concluir o login. Tente novamente.");
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">
            {step === "otp" ? "Verificação em duas etapas" : "Login"}
          </CardTitle>
          <CardDescription>
            {step === "otp"
              ? "Digite o código do seu aplicativo autenticador"
              : "Entre com seu indicativo e senha"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {registered && step === "credentials" && (
            <p className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              Cadastro realizado com sucesso! Verifique seu e-mail para ativar sua conta.
            </p>
          )}

          {step === "credentials" ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="space-y-2">
                <Label htmlFor="callsign">Indicativo</Label>
                <Input
                  id="callsign"
                  name="callsign"
                  placeholder="PY2XYZ"
                  required
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="text-right">
                  <Link
                    href="/esqueci-minha-senha"
                    className="text-sm text-muted-foreground underline hover:text-primary"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Entrando..." : "Entrar"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Não tem cadastro?{" "}
                <Link href="/register" className="underline hover:text-primary">
                  Registre-se
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="space-y-2">
                <Label htmlFor="otp">Código de verificação</Label>
                <Input
                  id="otp"
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  autoFocus
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Você também pode usar um código de recuperação.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Confiar neste dispositivo por 30 dias
              </label>

              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Verificando..." : "Verificar"}
              </Button>

              <button
                type="button"
                className="w-full text-center text-sm text-muted-foreground underline hover:text-primary"
                onClick={() => {
                  setStep("credentials");
                  setOtp("");
                  setError("");
                }}
              >
                Voltar
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
