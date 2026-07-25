"use client";

import { useActionState, useEffect, useState } from "react";
import { updateProfile, getProfile, type ProfileState } from "@/app/actions/profile";
import { getTwoFactorStatus } from "@/app/actions/two-factor";
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
import { TwoFactorSettings } from "@/components/two-factor-settings";

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
  const [emailValue, setEmailValue] = useState<string | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => {
    Promise.all([getProfile(), getTwoFactorStatus()]).then(
      ([data, twoFactor]) => {
        setProfile(data);
        setTwoFactorEnabled(twoFactor?.enabled ?? false);
        setLoading(false);
      }
    );
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
                onChange={(e) => setEmailValue(e.target.value)}
                required
              />
              {state.errors?.email && (
                <p className="text-sm text-destructive">{state.errors.email[0]}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Se alterar o e-mail, será necessário verificá-lo novamente.
              </p>
              {emailValue !== null && emailValue !== profile.email && (
                <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    Para alterar o e-mail, informe sua senha atual no campo
                    &ldquo;Senha atual&rdquo; abaixo.
                    {twoFactorEnabled &&
                      " Como o 2FA está ativo, informe também um código do autenticador."}
                  </p>
                  {twoFactorEnabled && (
                    <div className="space-y-2">
                      <Label htmlFor="otp">Código do autenticador</Label>
                      <Input
                        id="otp"
                        name="otp"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="000000"
                      />
                      {state.errors?.otp && (
                        <p className="text-sm text-destructive">
                          {state.errors.otp[0]}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
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
                placeholder="Mínimo 8 caracteres"
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

      <TwoFactorSettings />
    </div>
  );
}
