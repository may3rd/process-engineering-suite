"use client"

import * as React from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("ept-pes-theme")
      const theme = saved ? JSON.parse(saved) : "dark"
      if (theme === "light") {
        document.documentElement.classList.remove("dark")
      } else {
        document.documentElement.classList.add("dark")
      }
    } catch {
      document.documentElement.classList.add("dark")
    }
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {children}
    </div>
  )
}
