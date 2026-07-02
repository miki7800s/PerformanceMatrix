import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import type { OperatorRecord, PeriodMeta } from '@/types'
import * as db from '@/services/db'
import { loadSettings } from '@/hooks/useSettings'

interface ReportDataContextValue {
  loading: boolean
  periods: PeriodMeta[]
  activePeriod: string | null
  records: OperatorRecord[]
  setActivePeriod: (period: string) => Promise<void>
  deletePeriod: (period: string) => Promise<void>
  savePeriod: (
    period: string,
    records: OperatorRecord[],
    fileName: string,
  ) => Promise<void>
  periodExists: (period: string) => Promise<boolean>
}

const ReportDataContext = createContext<ReportDataContextValue | null>(null)

export function ReportDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [periods, setPeriods] = useState<PeriodMeta[]>([])
  const [activePeriod, setActive] = useState<string | null>(null)
  const [records, setRecords] = useState<OperatorRecord[]>([])

  const loadRecords = useCallback(async (period: string | null) => {
    if (!period) {
      setRecords([])
      return
    }
    setRecords(await db.getRecordsForPeriod(period))
  }, [])

  const refresh = useCallback(
    async (preferDefaultPeriod = false) => {
      const [allPeriods, storedActive] = await Promise.all([
        db.listPeriods(),
        db.getActivePeriod(),
      ])
      let active = storedActive
      // On startup the configured default period (Settings) wins.
      if (preferDefaultPeriod) {
        const preferred = loadSettings().defaultPeriod
        if (preferred && allPeriods.some((p) => p.id === preferred)) {
          active = preferred
        }
      }
      // Fall back to the newest period when none is explicitly active.
      if (!active || !allPeriods.some((p) => p.id === active)) {
        active = allPeriods[0]?.id ?? null
      }
      if (active && active !== storedActive) await db.setActivePeriod(active)
      setPeriods(allPeriods)
      setActive(active)
      await loadRecords(active)
    },
    [loadRecords],
  )

  useEffect(() => {
    refresh(true)
      .catch((err) => {
        console.error(err)
        toast.error('Nepodařilo se načíst uložená data.')
      })
      .finally(() => setLoading(false))
  }, [refresh])

  const setActivePeriod = useCallback(
    async (period: string) => {
      await db.setActivePeriod(period)
      setActive(period)
      await loadRecords(period)
    },
    [loadRecords],
  )

  const deletePeriod = useCallback(
    async (period: string) => {
      await db.deletePeriod(period)
      await refresh()
    },
    [refresh],
  )

  const savePeriod = useCallback(
    async (period: string, rows: OperatorRecord[], fileName: string) => {
      await db.savePeriod(period, rows, fileName)
      await refresh()
    },
    [refresh],
  )

  const value = useMemo(
    () => ({
      loading,
      periods,
      activePeriod,
      records,
      setActivePeriod,
      deletePeriod,
      savePeriod,
      periodExists: db.periodExists,
    }),
    [
      loading,
      periods,
      activePeriod,
      records,
      setActivePeriod,
      deletePeriod,
      savePeriod,
    ],
  )

  return (
    <ReportDataContext.Provider value={value}>
      {children}
    </ReportDataContext.Provider>
  )
}

export function useReportData() {
  const context = useContext(ReportDataContext)
  if (!context) {
    throw new Error('useReportData must be used within ReportDataProvider')
  }
  return context
}
