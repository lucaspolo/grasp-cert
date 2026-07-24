"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/lib/use-mounted";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      disabled={!mounted}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title={mounted ? (theme === "dark" ? "Tema claro" : "Tema escuro") : undefined}
      suppressHydrationWarning
    >
      {mounted && (theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      ))}
    </Button>
  );
}
