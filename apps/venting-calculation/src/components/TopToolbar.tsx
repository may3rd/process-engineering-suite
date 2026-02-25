"use client";

import { useTheme } from "@mui/material";
import { TopFloatingToolbar } from "@eng-suite/ui-kit";
import { useColorMode } from "@/contexts/ColorModeContext";
import { Droplets } from "lucide-react";

export function TopToolbar() {
  const theme = useTheme();
  const { toggleColorMode } = useColorMode();
  const isDark = theme.palette.mode === "dark";

  return (
    <TopFloatingToolbar
      title="Tank Venting"
      subtitle="API 2000 Venting Calculator"
      icon={<Droplets size={22} />}
      onToggleTheme={toggleColorMode}
      isDarkMode={isDark}
    />
  );
}
