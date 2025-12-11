"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { setTheme, theme } = useTheme();

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="rounded-full w-9 h-9 bg-secondary/50 hover:bg-secondary transition-colors relative overflow-hidden"
      title={theme === "dark" ? "Açık Tema'ya Geç" : "Koyu Tema'ya Geç"}
    >
      <Sun
        className={`h-[1.2rem] w-[1.2rem] transition-all duration-300 text-amber-500 ${
          theme === "dark"
            ? "opacity-0 -translate-y-2"
            : "opacity-100 translate-y-0"
        }`}
      />
      <Moon
        className={`absolute h-[1.2rem] w-[1.2rem] transition-all duration-300 text-indigo-400 ${
          theme === "dark"
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2"
        }`}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
