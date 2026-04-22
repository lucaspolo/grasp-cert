"use client";

import { useActionState } from "react";
import { registerUser, type RegisterState } from "@/app/actions/auth";
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

const initialState: RegisterState = {};

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(
    registerUser,
    initialState
  );

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Cadastro</CardTitle>
          <CardDescription>
            Registre-se para acessar seus certificados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {state.message && (
              <p className="text-sm text-destructive">{state.message}</p>
            )}

            <div className="space-y-2">
              <Label htmlFor="callsign">Indicativo</Label>
              <Input
                id="callsign"
                name="callsign"
                placeholder="PY2XYZ"
                required
              />
              {state.errors?.callsign && (
                <p className="text-sm text-destructive">
                  {state.errors.callsign[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" placeholder="Seu nome" required />
              {state.errors?.name && (
                <p className="text-sm text-destructive">
                  {state.errors.name[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                required
              />
              {state.errors?.email && (
                <p className="text-sm text-destructive">
                  {state.errors.email[0]}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" name="city" placeholder="São Paulo" required />
                {state.errors?.city && (
                  <p className="text-sm text-destructive">
                    {state.errors.city[0]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">UF</Label>
                <Input
                  id="state"
                  name="state"
                  placeholder="SP"
                  maxLength={2}
                  required
                />
                {state.errors?.state && (
                  <p className="text-sm text-destructive">
                    {state.errors.state[0]}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
              />
              {state.errors?.password && (
                <p className="text-sm text-destructive">
                  {state.errors.password[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
              />
              {state.errors?.confirmPassword && (
                <p className="text-sm text-destructive">
                  {state.errors.confirmPassword[0]}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Cadastrando..." : "Cadastrar"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Já tem cadastro?{" "}
              <Link href="/login" className="underline hover:text-primary">
                Fazer login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
