"use client"

import { useTheme } from "@mui/material"
import { TopFloatingToolbar } from "@eng-suite/ui-kit"
import { Thermometer } from "lucide-react"
import { useColorMode } from "@/contexts/ColorModeContext"

export function TopToolbar() {
  const theme = useTheme()
  const { toggleColorMode } = useColorMode()
  const isDark = theme.palette.mode === "dark"

  return (
    <TopFloatingToolbar
      title="Heat Transfer in Storage Tank"
      subtitle="Calculate heat loss and cooling rate for insulated storage tanks"
      icon={<Thermometer className="size-5" />}
      onToggleTheme={toggleColorMode}
      isDarkMode={isDark}
    />
  )
}
