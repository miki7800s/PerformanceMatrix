import * as React from 'react'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface ContextMenuItem {
  label: string
  icon?: LucideIcon
  onSelect: () => void
  destructive?: boolean
}

interface ContextMenuState {
  x: number
  y: number
  items: ContextMenuItem[]
}

/**
 * Minimal right-click context menu. Call `open(event, items)` from an
 * onContextMenu handler; the menu closes on click, Escape or scroll.
 */
export function useContextMenu() {
  const [state, setState] = React.useState<ContextMenuState | null>(null)

  const open = React.useCallback(
    (event: React.MouseEvent, items: ContextMenuItem[]) => {
      event.preventDefault()
      setState({ x: event.clientX, y: event.clientY, items })
    },
    [],
  )

  const close = React.useCallback(() => setState(null), [])

  React.useEffect(() => {
    if (!state) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [state, close])

  const menu = state
    ? createPortal(
        <div
          role="menu"
          className="fixed z-50 min-w-44 animate-fade-in-up rounded-md border bg-card p-1 shadow-lg"
          style={{
            left: Math.min(state.x, window.innerWidth - 200),
            top: Math.min(state.y, window.innerHeight - state.items.length * 36 - 16),
          }}
        >
          {state.items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={cn(
                'flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                item.destructive && 'text-destructive',
              )}
              onClick={() => {
                close()
                item.onSelect()
              }}
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )
    : null

  return { open, menu }
}
