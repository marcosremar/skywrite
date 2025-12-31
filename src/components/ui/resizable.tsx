"use client"

import * as React from "react"
import { GripVerticalIcon } from "lucide-react"
import { Group, Panel, Separator } from "react-resizable-panels"
import type { Layout } from "react-resizable-panels"

import { cn } from "@/lib/utils"

// Re-export types
export type { Layout }

interface ResizablePanelGroupProps extends Omit<React.ComponentProps<typeof Group>, 'orientation' | 'onLayoutChange'> {
  direction?: "horizontal" | "vertical"
  onLayout?: (sizes: number[]) => void
}

function ResizablePanelGroup({
  className,
  direction = "horizontal",
  onLayout,
  ...props
}: ResizablePanelGroupProps) {
  return (
    <Group
      data-slot="resizable-panel-group"
      orientation={direction}
      onLayoutChange={onLayout}
      className={cn(
        "flex h-full w-full",
        className
      )}
      {...props}
    />
  )
}

function ResizablePanel({
  className,
  ...props
}: React.ComponentProps<typeof Panel>) {
  return (
    <Panel
      data-slot="resizable-panel"
      className={cn("", className)}
      {...props}
    />
  )
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean
}) {
  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        "relative flex w-2 cursor-col-resize items-center justify-center bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-8 w-4 items-center justify-center rounded-sm bg-zinc-300 dark:bg-zinc-600 border border-zinc-400 dark:border-zinc-500">
          <GripVerticalIcon className="size-3 text-zinc-600 dark:text-zinc-300" />
        </div>
      )}
    </Separator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
