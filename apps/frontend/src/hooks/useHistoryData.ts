import { useEffect, useMemo, useState } from 'react'
import type { OperatorRecord } from '@/types'
import * as db from '@/services/db'
import { useReportData } from '@/hooks/useReportData'

interface HistoryState {
  loading: boolean
  /** Records sorted by period ascending (oldest → newest). */
  records: OperatorRecord[]
}

function sortByPeriod(records: OperatorRecord[]): OperatorRecord[] {
  return [...records].sort((a, b) => a.period.localeCompare(b.period, 'cs'))
}

/** One operator's rows across all imported periods. */
export function useOperatorHistory(fullName: string | null): HistoryState {
  const [state, setState] = useState<HistoryState>({
    loading: true,
    records: [],
  })

  useEffect(() => {
    if (!fullName) {
      setState({ loading: false, records: [] })
      return
    }
    let cancelled = false
    setState((prev) => ({ ...prev, loading: true }))
    db.getRecordsForOperator(fullName)
      .then((records) => {
        if (!cancelled)
          setState({ loading: false, records: sortByPeriod(records) })
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, records: [] })
      })
    return () => {
      cancelled = true
    }
  }, [fullName])

  return state
}

/**
 * Records of the period chronologically before the active one, or null
 * when there is no older period. Used for period-over-period deltas.
 */
export function usePreviousPeriod(): {
  previousId: string | null
  previousRecords: OperatorRecord[] | null
} {
  const { periods, activePeriod } = useReportData()
  const [previousRecords, setRecords] = useState<OperatorRecord[] | null>(null)

  const previousId = useMemo(() => {
    if (!activePeriod) return null
    const ordered = periods
      .map((p) => p.id)
      .sort((a, b) => a.localeCompare(b, 'cs'))
    const index = ordered.indexOf(activePeriod)
    return index > 0 ? ordered[index - 1] : null
  }, [periods, activePeriod])

  useEffect(() => {
    if (!previousId) {
      setRecords(null)
      return
    }
    let cancelled = false
    db.getRecordsForPeriod(previousId).then((rows) => {
      if (!cancelled) setRecords(rows)
    })
    return () => {
      cancelled = true
    }
  }, [previousId])

  return { previousId, previousRecords }
}

/** One manager's team rows across all imported periods. */
export function useManagerHistory(manager: string | null): HistoryState {
  const [state, setState] = useState<HistoryState>({
    loading: true,
    records: [],
  })

  useEffect(() => {
    if (!manager) {
      setState({ loading: false, records: [] })
      return
    }
    let cancelled = false
    setState((prev) => ({ ...prev, loading: true }))
    db.getRecordsForManager(manager)
      .then((records) => {
        if (!cancelled)
          setState({ loading: false, records: sortByPeriod(records) })
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, records: [] })
      })
    return () => {
      cancelled = true
    }
  }, [manager])

  return state
}
