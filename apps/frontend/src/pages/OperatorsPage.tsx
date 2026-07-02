import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Row,
  type SortingState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Copy,
  Download,
  FilterX,
  Search,
  Star,
  UserRound,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import type { OperatorRecord } from '@/types'
import { useReportData } from '@/hooks/useReportData'
import { useSettings } from '@/hooks/useSettings'
import { useWatchlist } from '@/hooks/useWatchlist'
import { exportToCsv, exportToExcel } from '@/services/exportService'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { CsatValue, PercentValue } from '@/components/PerformanceValue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useContextMenu } from '@/components/ui/context-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface FilterForm {
  search: string
  manager: string
  period: string
  minTotalPerformance: string
  maxTotalPerformance: string
  minAttendance: string
  minInternalRating: string
}

const columnHelper = createColumnHelper<OperatorRecord>()

const columns = [
  columnHelper.accessor('fullName', {
    header: 'Jméno',
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor('manager', {
    header: 'Manager',
    cell: (info) => (
      <span className="text-muted-foreground">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('attendance', {
    header: 'Attendance',
    cell: (info) => <PercentValue value={info.getValue()} />,
  }),
  columnHelper.accessor('productivity', {
    header: 'Productivity',
    cell: (info) => <PercentValue value={info.getValue()} />,
  }),
  columnHelper.accessor('productivityPerformance', {
    header: 'Productivity Perf.',
    cell: (info) => <PercentValue value={info.getValue()} />,
  }),
  columnHelper.accessor('internalRating', {
    header: 'Internal Rating',
    cell: (info) => <PercentValue value={info.getValue()} />,
  }),
  columnHelper.accessor('csatCallAverage', {
    header: 'CSAT Call',
    cell: (info) => <CsatValue value={info.getValue()} />,
  }),
  columnHelper.accessor('csatChatAverage', {
    header: 'CSAT Chat',
    cell: (info) => <CsatValue value={info.getValue()} />,
  }),
  columnHelper.accessor('csatCctAverage', {
    header: 'CSAT CCT',
    cell: (info) => <CsatValue value={info.getValue()} />,
  }),
  columnHelper.accessor('totalPerformance', {
    header: 'Total Performance',
    cell: (info) => (
      <PercentValue value={info.getValue()} className="font-semibold" />
    ),
  }),
]

const PAGE_SIZES = [10, 20, 50, 100]
const ALL_ROWS = 1_000_000
/** Above this row count the table body is virtualized. */
const VIRTUALIZE_FROM = 100

function parseNumberInput(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

export function OperatorsPage() {
  const { loading, records, periods, activePeriod, setActivePeriod } =
    useReportData()
  const { settings } = useSettings()
  const { isWatched, toggleWatch } = useWatchlist()
  const navigate = useNavigate()
  const { open: openContextMenu, menu: contextMenu } = useContextMenu()
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'totalPerformance', desc: true },
  ])

  // Mission Control cards deep-link here with pre-filled filters.
  const [searchParams] = useSearchParams()
  const { register, watch, reset } = useForm<FilterForm>({
    defaultValues: {
      search: '',
      manager:
        searchParams.get('manager') ?? (settings.defaultManager || 'all'),
      period: '',
      minTotalPerformance: searchParams.get('minTp') ?? '',
      maxTotalPerformance: searchParams.get('maxTp') ?? '',
      minAttendance: '',
      minInternalRating: '',
    },
  })
  // Watch individual fields (stable primitives) — watching the whole
  // form object would change identity every render and loop the table.
  const search = watch('search')
  const managerFilter = watch('manager')
  const minTotalPerformance = watch('minTotalPerformance')
  const maxTotalPerformance = watch('maxTotalPerformance')
  const minAttendance = watch('minAttendance')
  const minInternalRating = watch('minInternalRating')

  const managers = useMemo(
    () =>
      [...new Set(records.map((r) => r.manager))].sort((a, b) =>
        a.localeCompare(b, 'cs'),
      ),
    [records],
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const minTp = parseNumberInput(minTotalPerformance)
    const maxTp = parseNumberInput(maxTotalPerformance)
    const minAtt = parseNumberInput(minAttendance)
    const minIr = parseNumberInput(minInternalRating)

    return records.filter((record) => {
      if (managerFilter !== 'all' && record.manager !== managerFilter)
        return false
      if (query && !record.fullName.toLowerCase().includes(query)) return false
      if (minTp !== null) {
        if (record.totalPerformance === null) return false
        if (record.totalPerformance < minTp) return false
      }
      if (maxTp !== null) {
        if (record.totalPerformance === null) return false
        if (record.totalPerformance > maxTp) return false
      }
      if (minAtt !== null) {
        if (record.attendance === null) return false
        if (record.attendance < minAtt) return false
      }
      if (minIr !== null) {
        if (record.internalRating === null) return false
        if (record.internalRating < minIr) return false
      }
      return true
    })
  }, [
    records,
    search,
    managerFilter,
    minTotalPerformance,
    maxTotalPerformance,
    minAttendance,
    minInternalRating,
  ])

  const hasActiveFilter =
    search.trim() !== '' ||
    managerFilter !== 'all' ||
    minTotalPerformance !== '' ||
    maxTotalPerformance !== '' ||
    minAttendance !== '' ||
    minInternalRating !== ''

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: settings.pageSize } },
    autoResetPageIndex: true,
  })

  const rows = table.getRowModel().rows
  const virtualize = rows.length > VIRTUALIZE_FROM

  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 41,
    overscan: 12,
    enabled: virtualize,
  })

  const rowContextMenu = (event: React.MouseEvent, record: OperatorRecord) =>
    openContextMenu(event, [
      {
        label: 'Otevřít detail operátora',
        icon: UserRound,
        onSelect: () =>
          navigate(`/operators/${encodeURIComponent(record.fullName)}`),
      },
      {
        label: `Zobrazit tým (${record.manager})`,
        icon: Users,
        onSelect: () =>
          navigate(`/managers/${encodeURIComponent(record.manager)}`),
      },
      {
        label: isWatched(record.fullName)
          ? 'Odebrat ze sledovaných'
          : 'Sledovat (watchlist)',
        icon: Star,
        onSelect: () => {
          toggleWatch(record.fullName)
          toast.success(
            isWatched(record.fullName)
              ? `${record.fullName} odebrán ze sledovaných.`
              : `${record.fullName} přidán mezi sledované na Mission Control.`,
          )
        },
      },
      {
        label: 'Kopírovat jméno',
        icon: Copy,
        onSelect: () => {
          navigator.clipboard
            .writeText(record.fullName)
            .then(() => toast.success('Jméno zkopírováno do schránky.'))
            .catch(() => toast.error('Kopírování se nezdařilo.'))
        },
      },
    ])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!activePeriod || records.length === 0) {
    return (
      <>
        <PageHeader
          title="Operátoři"
          description="Výkonnost jednotlivých operátorů"
          showPeriod={false}
        />
        <EmptyState />
      </>
    )
  }

  const renderRow = (row: Row<OperatorRecord>, style?: React.CSSProperties) => (
    <TableRow
      key={row.id}
      className="cursor-pointer"
      style={style}
      onClick={() =>
        navigate(`/operators/${encodeURIComponent(row.original.fullName)}`)
      }
      onContextMenu={(e) => rowContextMenu(e, row.original)}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Operátoři"
        description={`${filtered.length} z ${records.length} operátorů v aktivním období · pravý klik na řádek = kontextové menu`}
        actions={
          <div className="no-print flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exportToExcel(filtered, `operatori-${activePeriod}`)
                toast.success('Export do Excelu byl stažen.')
              }}
            >
              <Download className="h-4 w-4" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exportToCsv(filtered, `operatori-${activePeriod}`)
                toast.success('Export do CSV byl stažen.')
              }}
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
        }
      />

      <form
        className="no-print grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Hledat operátora… ( / )"
            className="pl-8"
            data-shortcut-search
            {...register('search')}
          />
        </div>
        <Select {...register('manager')} aria-label="Filtr podle managera">
          <option value="all">Všichni manažeři</option>
          {managers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
        <Select
          value={activePeriod}
          aria-label="Filtr podle období"
          {...register('period', {
            onChange: (e) => setActivePeriod(e.target.value),
          })}
        >
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          variant="ghost"
          className="justify-start text-muted-foreground"
          disabled={!hasActiveFilter}
          onClick={() =>
            reset({
              search: '',
              manager: 'all',
              period: '',
              minTotalPerformance: '',
              maxTotalPerformance: '',
              minAttendance: '',
              minInternalRating: '',
            })
          }
        >
          <FilterX className="h-4 w-4" />
          Zrušit filtry
        </Button>
        <Input
          type="number"
          inputMode="decimal"
          placeholder="Min. Total Performance (%)"
          aria-label="Minimální Total Performance"
          {...register('minTotalPerformance')}
        />
        <Input
          type="number"
          inputMode="decimal"
          placeholder="Max. Total Performance (%)"
          aria-label="Maximální Total Performance"
          {...register('maxTotalPerformance')}
        />
        <Input
          type="number"
          inputMode="decimal"
          placeholder="Min. Attendance (%)"
          aria-label="Minimální Attendance"
          {...register('minAttendance')}
        />
        <Input
          type="number"
          inputMode="decimal"
          placeholder="Min. Internal Rating (%)"
          aria-label="Minimální Internal Rating"
          {...register('minInternalRating')}
        />
      </form>

      <div className="rounded-lg border bg-card">
        <div
          ref={scrollRef}
          className={virtualize ? 'max-h-[640px] overflow-auto' : undefined}
        >
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const sortDir = header.column.getIsSorted()
                    return (
                      <TableHead
                        key={header.id}
                        className={
                          virtualize
                            ? 'sticky top-0 z-10 bg-card shadow-[0_1px_0_hsl(var(--border))]'
                            : undefined
                        }
                      >
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {sortDir === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : sortDir === 'desc' ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </button>
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Žádný operátor neodpovídá filtru.
                  </TableCell>
                </TableRow>
              ) : virtualize ? (
                <>
                  {virtualizer.getVirtualItems().length > 0 && (
                    <tr
                      style={{
                        height: virtualizer.getVirtualItems()[0].start,
                      }}
                      aria-hidden
                    />
                  )}
                  {virtualizer
                    .getVirtualItems()
                    .map((virtualRow) => renderRow(rows[virtualRow.index]))}
                  <tr
                    style={{
                      height:
                        virtualizer.getTotalSize() -
                        (virtualizer.getVirtualItems().at(-1)?.end ?? 0),
                    }}
                    aria-hidden
                  />
                </>
              ) : (
                rows.map((row) => renderRow(row))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Řádků na stránku</span>
          <Select
            className="w-24"
            value={String(table.getState().pagination.pageSize)}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
            <option value={ALL_ROWS}>Vše</option>
          </Select>
          {virtualize && (
            <span className="text-xs">
              (virtualizované vykreslování {rows.length} řádků)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Stránka {table.getState().pagination.pageIndex + 1} z{' '}
            {Math.max(1, table.getPageCount())}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Předchozí
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Další
          </Button>
        </div>
      </div>

      {contextMenu}
    </div>
  )
}
