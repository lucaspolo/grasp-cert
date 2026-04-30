"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

type MobileNavProps = {
  callsign: string;
  role: string;
  signOutAction: () => Promise<void>;
};

export function MobileNav({ callsign, role, signOutAction }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  const isOwner = role === "OWNER";
  const isOwnerOrAdmin = isOwner || role === "ADMIN";
  const hasAdminAccess = isOwnerOrAdmin || role === "OPERATOR";

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-muted-foreground hover:text-foreground"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setOpen(false)}
          />

          {/* Slide-out panel */}
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-background border-r shadow-lg flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b">
              <span className="font-semibold text-lg">GRASP Cert</span>
              <button
                onClick={() => setOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              <NavLink href="/" onClick={() => setOpen(false)}>
                Meus Certificados
              </NavLink>
              {isOwner && (
                <NavLink href="/admin/users" onClick={() => setOpen(false)}>
                  Usuários
                </NavLink>
              )}
              {hasAdminAccess && (
                <NavLink href="/admin/events" onClick={() => setOpen(false)}>
                  Eventos
                </NavLink>
              )}
              {isOwnerOrAdmin && (
                <>
                  <div className="pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Configurações
                  </div>
                  <NavLink href="/admin/templates" onClick={() => setOpen(false)}>
                    Templates
                  </NavLink>
                  <NavLink href="/admin/bands" onClick={() => setOpen(false)}>
                    Bandas
                  </NavLink>
                  <NavLink href="/admin/modes" onClick={() => setOpen(false)}>
                    Modos
                  </NavLink>
                </>
              )}
            </nav>

            <div className="border-t px-4 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <Link
                  href="/configuracoes"
                  className="text-sm font-medium hover:text-foreground"
                  onClick={() => setOpen(false)}
                >
                  {callsign}
                </Link>
                <ThemeToggle />
              </div>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
