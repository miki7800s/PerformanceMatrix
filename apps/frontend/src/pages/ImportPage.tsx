import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { REQUIRED_COLUMNS } from '@care-dashboard/shared'
import type { ConflictResolution, ParsedImport } from '@/types'
import { useReportData } from '@/hooks/useReportData'
import {
  ImportValidationError,
  parseWorkbook,
} from '@/services/excelParser'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'

interface ConflictState {
  parsed: ParsedImport
  conflicts: string[]
}

export function ImportPage() {
  const { savePeriod, periodExists, setActivePeriod } = useReportData()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<ConflictState | null>(null)

  const importPeriods = useCallback(
    async (parsed: ParsedImport, skipPeriods: Set<string>) => {
      const imported: string[] = []
      for (const { period, records } of parsed.periods) {
        if (skipPeriods.has(period)) continue
        await savePeriod(period, records, parsed.fileName)
        imported.push(period)
      }
      if (imported.length > 0) {
        await setActivePeriod(imported[imported.length - 1])
        toast.success(
          imported.length === 1
            ? `Období ${imported[0]} bylo importováno.`
            : `Importována období: ${imported.join(', ')}.`,
        )
        for (const warning of parsed.warnings.slice(0, 3)) {
          toast.warning(warning)
        }
        navigate('/')
      } else {
        toast.info('Import byl dokončen bez změn.')
      }
    },
    [savePeriod, setActivePeriod, navigate],
  )

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      setBusy(true)
      try {
        const parsed = await parseWorkbook(file)
        const conflicts: string[] = []
        for (const { period } of parsed.periods) {
          if (await periodExists(period)) conflicts.push(period)
        }
        if (conflicts.length > 0) {
          setConflict({ parsed, conflicts })
        } else {
          await importPeriods(parsed, new Set())
        }
      } catch (err) {
        const message =
          err instanceof ImportValidationError
            ? err.message
            : 'Import selhal. Zkontrolujte, zda jde o platný Excel export.'
        setError(message)
        toast.error(message)
      } finally {
        setBusy(false)
      }
    },
    [periodExists, importPeriods],
  )

  const resolveConflict = useCallback(
    async (resolution: ConflictResolution) => {
      if (!conflict) return
      const { parsed, conflicts } = conflict
      setConflict(null)
      if (resolution === 'cancel') {
        toast.info('Import byl zrušen.')
        return
      }
      setBusy(true)
      try {
        const skip =
          resolution === 'keep' ? new Set(conflicts) : new Set<string>()
        await importPeriods(parsed, skip)
      } finally {
        setBusy(false)
      }
    },
    [conflict, importPeriods],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import reportu"
        description="Nahrajte Power BI export ve formátu Excel (.xlsx). Data zůstávají pouze ve vašem prohlížeči."
        showPeriod={false}
      />

      <div
        role="button"
        tabIndex={0}
        aria-label="Nahrát Excel soubor"
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-14 text-center transition-colors',
          dragging
            ? 'border-primary bg-accent'
            : 'hover:border-primary/50 hover:bg-muted/40',
          busy && 'pointer-events-none opacity-60',
        )}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        {busy ? (
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        ) : (
          <div className="rounded-full bg-accent p-4 text-accent-foreground">
            <Upload className="h-8 w-8" />
          </div>
        )}
        <div>
          <p className="font-semibold">
            {busy ? 'Zpracovávám soubor…' : 'Přetáhněte soubor sem'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            nebo klikněte pro výběr souboru (.xlsx, .xls)
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Import se nezdařil</p>
            <p className="mt-1 text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-4 w-4" />
            Očekávaná struktura souboru
          </CardTitle>
          <CardDescription>
            První list musí obsahovat všechny povinné sloupce. Prázdné a
            neplatné hodnoty jsou při importu bezpečně ošetřeny.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {REQUIRED_COLUMNS.map((column) => (
              <Badge key={column} variant="outline">
                {column}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={conflict !== null}
        onOpenChange={(open) => {
          if (!open) resolveConflict('cancel')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Období již existuje</DialogTitle>
            <DialogDescription>
              {conflict && (
                <>
                  V historii už {conflict.conflicts.length === 1 ? 'je' : 'jsou'}{' '}
                  uloženo:{' '}
                  <span className="font-medium text-foreground">
                    {conflict.conflicts.join(', ')}
                  </span>
                  . Jak chcete pokračovat?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => resolveConflict('cancel')}>
              Zrušit import
            </Button>
            <Button
              variant="outline"
              onClick={() => resolveConflict('keep')}
            >
              Ponechat stávající
            </Button>
            <Button onClick={() => resolveConflict('overwrite')}>
              Přepsat novými daty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
