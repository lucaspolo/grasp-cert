"use client";

import { useActionState, useEffect, useState } from "react";
import { updateProfile, getProfile, type ProfileState } from "@/app/actions/profile";
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

const initialState: ProfileState = {};

export default function ConfiguracoesPage() {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const [profile, setProfile] = useState<{
    callsign: string;
    name: string;
    email: string;
    city: string;
    state: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile().then((data) => {
      setProfile(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-destructive">Erro ao carregar perfil.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle>Dados pessoais</CardTitle>
          <CardDescription>
            Atualize suas informações cadastrais. O indicativo não pode ser alterado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.success && (
            <p className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              {state.success}
            </p>
          )}

          {state.error && (
            <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {state.error}
            </p>
          )}

          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="callsign">Indicativo</Label>
              <Input
                id="callsign"
                value={profile.callsign}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O indicativo não pode ser alterado.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                defaultValue={profile.name}
                required
                minLength={2}
              />
              {state.errors?.name && (
                <p className="text-sm text-destructive">{state.errors.name[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={profile.email}
                required
              />
              {state.errors?.email && (
                <p className="text-sm text-destructive">{state.errors.email[0]}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Se alterar o e-mail, será necessário verificá-lo novamente.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  name="city"
                  defaultValue={profile.city}
                  required
                  minLength={2}
                />
                {state.errors?.city && (
                  <p className="text-sm text-destructive">{state.errors.city[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado (UF)</Label>
                <Input
                  id="state"
                  name="state"
                  defaultValue={profile.state}
                  required
                  maxLength={2}
                />
                {state.errors?.state && (
                  <p className="text-sm text-destructive">{state.errors.state[0]}</p>
                )}
              </div>
            </div>

            <hr className="my-6" />

            <CardTitle className="text-lg">Alterar senha</CardTitle>
            <CardDescription className="mb-4">
              Preencha apenas se desejar alterar sua senha.
            </CardDescription>

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha atual</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
              />
              {state.errors?.currentPassword && (
                <p className="text-sm text-destructive">
                  {state.errors.currentPassword[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                placeholder="Mínimo 6 caracteres"
              />
              {state.errors?.newPassword && (
                <p className="text-sm text-destructive">
                  {state.errors.newPassword[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Confirmar nova senha</Label>
              <Input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type="password"
              />
              {state.errors?.confirmNewPassword && (
                <p className="text-sm text-destructive">
                  {state.errors.confirmNewPassword[0]}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
