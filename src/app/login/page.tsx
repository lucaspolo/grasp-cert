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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");

  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const callsign = formData.get("callsign") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      callsign: callsign.toUpperCase(),
      password,
      redirect: false,
    });

    if (result?.error) {
      if (result.code === "EMAIL_NOT_VERIFIED") {
        setError("E-mail não verificado. Verifique sua caixa de entrada para ativar sua conta.");
      } else {
        setError("Indicativo ou senha inválidos");
      }
      setPending(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Entre com seu indicativo e senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          {registered && (
            <p className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              Cadastro realizado com sucesso! Verifique seu e-mail para ativar sua conta.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="space-y-2">
              <Label htmlFor="callsign">Indicativo</Label>
              <Input
                id="callsign"
                name="callsign"
                placeholder="PY2XYZ"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
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
