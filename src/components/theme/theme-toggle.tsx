"use client";

import { useTheme } from "@/components/theme/theme-provider";

type ThemeToggleProps = {
  compact?: boolean;
};

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const label = theme === "dark" ? "Ljust lage" : "Morkt lage";
  const icon = theme === "dark" ? "☀" : "☾";
  void compact;

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Byt till ${label.toLowerCase()}`}
      title={`Byt till ${label.toLowerCase()}`}
    >
      <span className="theme-toggle__icon" aria-hidden="true">{icon}</span>
    </button>
  );
}
