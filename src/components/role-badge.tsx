import { Badge } from "@/components/ui/badge";
import { AUDIENCE_LABELS, type TutorialAudience } from "@/lib/role-labels";

/** Sem login vira contorno; cargos administrativos vêm sólidos. */
const VARIANTS: Record<TutorialAudience, "default" | "secondary" | "outline"> = {
  PUBLIC: "outline",
  USER: "secondary",
  OPERATOR: "secondary",
  ADMIN: "default",
  OWNER: "default",
};

export function RoleBadge({ audience }: { audience: TutorialAudience }) {
  return <Badge variant={VARIANTS[audience]}>{AUDIENCE_LABELS[audience]}</Badge>;
}
