import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Download,
  GitCompareArrows,
  RefreshCcw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useReportData } from '@/hooks/useReportData'
import * as db from '@/services/db'
import { exportToExcel } from '@/services/exportService'
import {
  ImportValidationError,
  parseWorkbook,
} from '@/services/excelParser'
import { formatDateTime, formatInt } from '@/utils/format'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function HistoryPage() {
  const {
    loading,
    periods,
    activePeriod,
    setActivePeriod,
    deletePeriod,
    savePeriod,
  } = useReportData()
  const [toDelete, setToDelete] = useState<string | null>(null)
  const [busyPeriod, setBusyPeriod] = useState<string | null>(null)
  const overwriteInputRef = useRef<HTMLInputElement>(null)
  const overwriteTarget = useRef<string | null>(null)

  const handleExport = async (period: string) => {
    try {
      const records = await db.getRecordsForPeriod(period)
      exportToExcel(records, `report-${period}`)
      toast.success(`Období ${period} bylo exportováno do Excelu.`)
    } catch {
      toast.error('Export se nezdařil.')
    }
  }

  const handleOverwriteFile = async (file: File) => {
    const target = overwriteTarget.current
    overwriteTarget.current = null
    if (!target) return
    setBusyPeriod(target)
    try {
      const parsed = await parseWorkbook(file)
      const match = parsed.periods.find((p) => p.period === target)
      if (!match) {
        toast.error(
          `Soubor neobsahuje období ${target}. Nalezená období: ${parsed.periods
            .map((p) => p.period)
            .join(', ')}.`,
        )
        return
      }
      await savePeriod(target, match.records, parsed.fileName)
      toast.success(
        `Období ${target} bylo přepsáno (${match.records.length} operátorů).`,
      )
    } catch (err) {
      toast.error(
        err instanceof ImportValidationError
          ? err.message
          : 'Přepsání období se nezdařilo.',
      )
    } finally {
      setBusyPeriod(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Historie reportů"
        description="Každé importované období je uloženo zvlášť v prohlížeči (IndexedDB)."
        showPeriod={false}
        actions={
          periods.length >= 2 ? (
            <Button asChild variant="outline">
              <Link to="/compare">
                <GitCompareArrows className="h-4 w-4" />
                Porovnat období
              </Link>
            </Button>
          ) : undefined
        }
      />

      {periods.length === 0 ? (
        <EmptyState
          title="Žádné uložené reporty"
          description="Zatím nebylo importováno žádné období."
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Období</TableHead>
                <TableHead>Importováno</TableHead>
                <TableHead>Soubor</TableHead>
                <TableHead>Operátoři</TableHead>
                <TableHead>Manažeři</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead className="text-right">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map((period) => {
                const isActive = period.id === activePeriod
                const isBusy = busyPeriod === period.id
                return (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">
                      {period.label}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(period.importedAt)}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-muted-foreground">
                      {period.fileName}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatInt(period.recordCount)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatInt(period.managerCount ?? null)}
                    </TableCell>
                    <TableCell>
                      {isActive ? (
                        <Badge className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Aktivní
                        </Badge>
                      ) : (
                        <Badge variant="outline">Uloženo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {!isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isBusy}
                            onClick={async () => {
                              await setActivePeriod(period.id)
                              toast.success(
                                `Aktivní období: ${period.label}`,
                              )
                            }}
                          >
                            Nastavit jako aktivní
                          </Button>
                        )}
                        <Tooltip content="Exportovat období do Excelu">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isBusy}
                            aria-label={`Exportovat období ${period.label}`}
                            onClick={() => handleExport(period.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Přepsat období novým souborem">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isBusy}
                            aria-label={`Přepsat období ${period.label}`}
                            onClick={() => {
                              overwriteTarget.current = period.id
                              overwriteInputRef.current?.click()
                            }}
                          >
                            <RefreshCcw
                              className={isBusy ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
                            />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Odstranit období">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isBusy}
                            aria-label={`Odstranit období ${period.label}`}
                            onClick={() => setToDelete(period.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <input
        ref={overwriteInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleOverwriteFile(file)
          e.target.value = ''
        }}
      />

      <Dialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odstranit období?</DialogTitle>
            <DialogDescription>
              Období <span className="font-medium">{toDelete}</span> a všechna
              jeho data budou trvale odstraněna z prohlížeče. Tuto akci nelze
              vrátit zpět.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Zrušit
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!toDelete) return
                const label = toDelete
                setToDelete(null)
                await deletePeriod(label)
                toast.success(`Období ${label} bylo odstraněno.`)
              }}
            >
              Odstranit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
