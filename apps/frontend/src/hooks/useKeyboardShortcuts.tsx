import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/hooks/useTheme'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'Ctrl K', label: 'Rychlé vyhledávání (paleta příkazů)' },
  { keys: 'g d', label: 'Přejít na Mission Control' },
  { keys: 'g s', label: 'Přejít na Měsíční souhrn' },
  { keys: 'g x', label: 'Přejít na Matrix' },
  { keys: 'g e', label: 'Přejít na Heatmapu' },
  { keys: 'g o', label: 'Přejít na Operátory' },
  { keys: 'g m', label: 'Přejít na Manažery' },
  { keys: 'g r', label: 'Přejít na Ranking' },
  { keys: 'g p', label: 'Přejít na Porovnání období' },
  { keys: 'g h', label: 'Přejít na Historii' },
  { keys: 'g i', label: 'Přejít na Import' },
  { keys: 'g n', label: 'Přejít na Nastavení' },
  { keys: 't', label: 'Přepnout tmavý/světlý režim' },
  { keys: '/', label: 'Fokus na vyhledávání (kde existuje)' },
  { keys: '?', label: 'Zobrazit tuto nápovědu' },
]

const GO_TARGETS: Record<string, string> = {
  d: '/',
  s: '/summary',
  x: '/matrix',
  e: '/heatmap',
  o: '/operators',
  m: '/managers',
  r: '/ranking',
  p: '/compare',
  h: '/history',
  i: '/import',
  n: '/settings',
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  )
}

/**
 * Global keyboard shortcuts: `g` + letter navigation, `t` theme,
 * `/` search focus, `?` help. Ignored while typing in a field.
 */
export function KeyboardShortcuts() {
  const navigate = useNavigate()
  const { toggleTheme } = useTheme()
  const [helpOpen, setHelpOpen] = useState(false)
  const pendingG = useRef(false)
  const pendingTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (isTypingTarget(e.target)) return

      const key = e.key.toLowerCase()

      if (pendingG.current) {
        pendingG.current = false
        window.clearTimeout(pendingTimer.current)
        const target = GO_TARGETS[key]
        if (target) {
          e.preventDefault()
          navigate(target)
        }
        return
      }

      if (key === 'g') {
        pendingG.current = true
        window.clearTimeout(pendingTimer.current)
        pendingTimer.current = window.setTimeout(() => {
          pendingG.current = false
        }, 1200)
        return
      }
      if (key === 't') {
        e.preventDefault()
        toggleTheme()
        return
      }
      if (e.key === '/') {
        const search = document.querySelector<HTMLInputElement>(
          'input[data-shortcut-search]',
        )
        if (search) {
          e.preventDefault()
          search.focus()
        }
        return
      }
      if (e.key === '?') {
        e.preventDefault()
        setHelpOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate, toggleTheme])

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Klávesové zkratky</DialogTitle>
          <DialogDescription>
            Zkratky fungují mimo textová pole.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-1.5">
          {SHORTCUTS.map((shortcut) => (
            <li
              key={shortcut.keys}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">{shortcut.label}</span>
              <span className="flex gap-1">
                {shortcut.keys.split(' ').map((key, i) => (
                  <kbd
                    key={i}
                    className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
