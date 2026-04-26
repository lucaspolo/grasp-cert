"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { newPassword, type NewPasswordState } from "@/app/actions/new-password";
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

const initialState: NewPasswordState = {};

function NovaSenhaForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, formAction, pending] = useActionState(newPassword, initialState);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-sm text-destructive">
              Token não fornecido. Verifique o link recebido por e-mail.
            </p>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              <Link href="/login" className="underline hover:text-primary">
                Voltar ao login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Nova senha</CardTitle>
          <CardDescription>
            Digite sua nova senha abaixo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.success && (
            <div className="mb-4 rounded-md bg-green-50 p-3 dark:bg-green-950">
              <p className="text-sm text-green-700 dark:text-green-300">
                {state.success}
              </p>
              <p className="mt-2 text-sm">
                <Link href="/login" className="underline hover:text-primary">
                  Ir para o login
                </Link>
              </p>
            </div>
          )}

          {state.error && (
            <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {state.error}
            </p>
          )}

          {!state.success && (
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="token" value={token} />

              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Redefinindo..." : "Redefinir senha"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="underline hover:text-primary">
                  Voltar ao login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function NovaSenhaPage() {
  return (
    <Suspense>
      <NovaSenhaForm />
    </Suspense>
  );
}
