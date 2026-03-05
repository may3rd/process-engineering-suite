"use client"

import * as React from "react"

/**
 * Providers — wrapper for all context providers (Theme, Tooltips, etc).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Simplified for skeleton; add actual ThemeProvider from ui-kit if available.
  return (
    <div className="min-h-screen bg-background text-foreground antialiased font-sans">
      {children}
    </div>
  )
}
