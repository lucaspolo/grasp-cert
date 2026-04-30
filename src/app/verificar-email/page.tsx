"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { verifyEmail, type VerifyEmailState } from "@/app/actions/verify-email";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

const initialState: VerifyEmailState = {};

function VerificarEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, formAction, pending] = useActionState(verifyEmail, initialState);

  useEffect(() => {
    if (token) {
      const formData = new FormData();
      formData.append("token", token);
      formAction(formData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
          <CardTitle className="text-2xl">Verificação de e-mail</CardTitle>
          <CardDescription>
            Confirmando seu endereço de e-mail...
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending && (
            <p className="text-sm text-muted-foreground">Verificando...</p>
          )}

          {state.success && (
            <div className="rounded-md bg-green-50 p-3 dark:bg-green-950">
              <p className="text-sm text-green-700 dark:text-green-300">
                {state.success}
              </p>
              <p className="mt-3 text-center">
                <Link
                  href="/login"
                  className="inline-block w-full rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Ir para o login
                </Link>
              </p>
            </div>
          )}

          {state.error && (
            <div className="rounded-md bg-red-50 p-3 dark:bg-red-950">
              <p className="text-sm text-red-700 dark:text-red-300">
                {state.error}
              </p>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                <Link href="/login" className="underline hover:text-primary">
                  Voltar ao login
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerificarEmailPage() {
  return (
    <Suspense>
      <VerificarEmailForm />
    </Suspense>
  );
}
