import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { OperatorRecord, PeriodMeta } from '@/types'

/**
 * All report data lives in IndexedDB in the browser — nothing ever
 * leaves the machine.
 */
interface CareDashboardDB extends DBSchema {
  periods: {
    key: string
    value: PeriodMeta
  }
  records: {
    key: string
    value: OperatorRecord
    indexes: { 'by-period': string; 'by-name': string; 'by-manager': string }
  }
  meta: {
    key: string
    value: string
  }
}

const DB_NAME = 'care-performance-dashboard'
const DB_VERSION = 2
const ACTIVE_PERIOD_KEY = 'activePeriod'

let dbPromise: Promise<IDBPDatabase<CareDashboardDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<CareDashboardDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          db.createObjectStore('periods', { keyPath: 'id' })
          const records = db.createObjectStore('records', { keyPath: 'id' })
          records.createIndex('by-period', 'period')
          db.createObjectStore('meta')
        }
        if (oldVersion >= 1 && oldVersion < 2) {
          // v2: indexes for operator/team trends across periods.
          const records = tx.objectStore('records')
          records.createIndex('by-name', 'fullName')
          records.createIndex('by-manager', 'manager')
        } else if (oldVersion < 1) {
          const records = tx.objectStore('records')
          records.createIndex('by-name', 'fullName')
          records.createIndex('by-manager', 'manager')
        }
      },
    })
  }
  return dbPromise
}

export async function listPeriods(): Promise<PeriodMeta[]> {
  const db = await getDb()
  const periods = await db.getAll('periods')

  // Backfill managerCount for periods imported before it existed.
  for (const period of periods) {
    if (period.managerCount === undefined) {
      const records = await db.getAllFromIndex(
        'records',
        'by-period',
        period.id,
      )
      period.managerCount = new Set(records.map((r) => r.manager)).size
      await db.put('periods', period)
    }
  }

  return periods.sort((a, b) => b.label.localeCompare(a.label, 'cs'))
}

export async function periodExists(period: string): Promise<boolean> {
  const db = await getDb()
  return (await db.get('periods', period)) !== undefined
}

export async function savePeriod(
  period: string,
  records: OperatorRecord[],
  fileName: string,
): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(['periods', 'records'], 'readwrite')

  // Replace any existing rows of the same period.
  const existingKeys = await tx
    .objectStore('records')
    .index('by-period')
    .getAllKeys(period)
  for (const key of existingKeys) {
    await tx.objectStore('records').delete(key)
  }
  for (const record of records) {
    await tx.objectStore('records').put(record)
  }
  await tx.objectStore('periods').put({
    id: period,
    label: period,
    importedAt: new Date().toISOString(),
    recordCount: records.length,
    managerCount: new Set(records.map((r) => r.manager)).size,
    fileName,
  })
  await tx.done
}

export async function deletePeriod(period: string): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(['periods', 'records', 'meta'], 'readwrite')
  const keys = await tx
    .objectStore('records')
    .index('by-period')
    .getAllKeys(period)
  for (const key of keys) {
    await tx.objectStore('records').delete(key)
  }
  await tx.objectStore('periods').delete(period)
  const active = await tx.objectStore('meta').get(ACTIVE_PERIOD_KEY)
  if (active === period) {
    await tx.objectStore('meta').delete(ACTIVE_PERIOD_KEY)
  }
  await tx.done
}

export async function getRecordsForPeriod(
  period: string,
): Promise<OperatorRecord[]> {
  const db = await getDb()
  return db.getAllFromIndex('records', 'by-period', period)
}

/** All rows of one operator across every imported period. */
export async function getRecordsForOperator(
  fullName: string,
): Promise<OperatorRecord[]> {
  const db = await getDb()
  return db.getAllFromIndex('records', 'by-name', fullName)
}

/** All rows of one manager's team across every imported period. */
export async function getRecordsForManager(
  manager: string,
): Promise<OperatorRecord[]> {
  const db = await getDb()
  return db.getAllFromIndex('records', 'by-manager', manager)
}

export async function getActivePeriod(): Promise<string | null> {
  const db = await getDb()
  const value = await db.get('meta', ACTIVE_PERIOD_KEY)
  return value ?? null
}

export async function setActivePeriod(period: string): Promise<void> {
  const db = await getDb()
  await db.put('meta', period, ACTIVE_PERIOD_KEY)
}
