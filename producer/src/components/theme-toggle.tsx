"use client";

import * as React from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <button
      onClick={() => (theme === "dark" ? setTheme("light") : setTheme("dark"))}
    >
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );
}
