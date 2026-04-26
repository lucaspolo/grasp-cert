"use client";

import type { ReactNode } from "react";

interface RoleGuardProps {
  allowedRoles: string[];
  userRole: string;
  children: ReactNode;
}

export function RoleGuard({ allowedRoles, userRole, children }: RoleGuardProps) {
  if (!allowedRoles.includes(userRole)) {
    return null;
  }

  return <>{children}</>;
}
