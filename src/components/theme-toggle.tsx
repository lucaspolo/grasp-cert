"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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
