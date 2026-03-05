"use client";

import { useTheme } from "@mui/material";
import { TopFloatingToolbar } from "@eng-suite/ui-kit";
import CalculatorIcon from "@mui/icons-material/Calculate"; // TODO: Replace per app
import { useColorMode } from "@/contexts/ColorModeContext";

export function TopToolbar() {
  const theme = useTheme();
  const { toggleColorMode } = useColorMode();
  const isDark = theme.palette.mode === "dark";

  return (
    <TopFloatingToolbar
      title="App Title" // TODO: replace per app
      subtitle="Subtitle · Process Engineering Suite" // TODO: replace per app
      icon={<CalculatorIcon fontSize="medium" />} // TODO: replace per app
      onToggleTheme={toggleColorMode}
      isDarkMode={isDark}
    />
  );
}
