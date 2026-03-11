/**
 * SectionCard — consistent card wrapper for each input section.
 */
"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface SectionCardProps {
  title: string
  children: ReactNode
  className?: string
  action?: ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
}

export function SectionCard({
  title,
  children,
  className,
  action,
  collapsible = false,
  defaultOpen = true,
}: SectionCardProps) {
  const [open, setOpen] = useState(defaultOpen)

  if (!collapsible) {
    return (
      <Card className={cn("shadow-sm", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {action}
          </div>
          <Separator />
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={cn("shadow-sm transition-all", !open && "gap-0 py-0", className)}>
        <CardHeader className={cn("transition-all", open ? "pb-3" : "px-6 pt-3")}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {action}
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${open ? "Collapse" : "Expand"} ${title}`}
                >
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
                  />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          {open ? <Separator /> : null}
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
