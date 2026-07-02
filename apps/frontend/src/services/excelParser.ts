import * as XLSX from 'xlsx'
import {
  AVERAGE_METRICS,
  COLUMN_MAP,
  COUNT_METRICS,
  PERCENT_METRICS,
  REQUIRED_COLUMNS,
  type OperatorMetricKey,
  type OperatorRecord,
} from '@care-dashboard/shared'
import type { ParsedImport } from '@/types'

export class ImportValidationError extends Error {
  constructor(
    message: string,
    public readonly missingColumns: string[] = [],
  ) {
    super(message)
    this.name = 'ImportValidationError'
  }
}

const normalizeHeader = (header: string) =>
  header.trim().replace(/\s+/g, ' ').toLowerCase()

/** Normalised header → field lookup built once from the shared map. */
const HEADER_LOOKUP = new Map(
  Object.entries(COLUMN_MAP).map(([header, field]) => [
    normalizeHeader(header),
    field,
  ]),
)

const NUMERIC_METRICS: OperatorMetricKey[] = [
  ...PERCENT_METRICS,
  ...COUNT_METRICS,
  ...AVERAGE_METRICS,
]

/**
 * Parses a cell into a number. Handles empty values, NaN, null, strings
 * with commas/percent signs and anything else non-numeric → null.
 */
function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/%/g, '').replace(/\s/g, '').replace(',', '.')
    if (cleaned === '' || cleaned === '-') return null
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function parseText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

interface IntermediateRow {
  period: string
  manager: string
  fullName: string
  numbers: Record<OperatorMetricKey, number | null>
}

/**
 * Excel percent cells often arrive as fractions (1.03 shown as 103 %).
 * If every value of a percent column is ≤ 5, the whole column is treated
 * as fractional and scaled ×100. Values above 100 % are valid and must
 * never be clamped.
 */
function normalizePercentColumns(rows: IntermediateRow[]) {
  for (const metric of PERCENT_METRICS) {
    const values = rows
      .map((row) => row.numbers[metric])
      .filter((v): v is number => v !== null)
    if (values.length === 0) continue
    const max = Math.max(...values.map(Math.abs))
    if (max <= 5) {
      for (const row of rows) {
        const value = row.numbers[metric]
        if (value !== null) row.numbers[metric] = value * 100
      }
    }
  }
}

/**
 * Reads a Power BI Excel export, validates required columns and returns
 * rows grouped by period. Throws {@link ImportValidationError} when the
 * file cannot be used.
 */
export async function parseWorkbook(file: File): Promise<ParsedImport> {
  const buffer = await file.arrayBuffer()
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: 'array' })
  } catch {
    throw new ImportValidationError(
      'Soubor se nepodařilo přečíst. Nahrajte platný Excel export (.xlsx / .xls).',
    )
  }

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new ImportValidationError('Soubor neobsahuje žádný list.')
  }
  const sheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
  })

  if (rawRows.length === 0) {
    throw new ImportValidationError('List neobsahuje žádná data.')
  }

  // Validate that every required column exists (case/whitespace tolerant).
  const presentHeaders = new Set(
    Object.keys(rawRows[0]).map((h) => normalizeHeader(h)),
  )
  const missing = REQUIRED_COLUMNS.filter(
    (col) => !presentHeaders.has(normalizeHeader(col)),
  )
  if (missing.length > 0) {
    throw new ImportValidationError(
      `V souboru chybí povinné sloupce: ${missing.join(', ')}.`,
      missing,
    )
  }

  const warnings: string[] = []
  const rows: IntermediateRow[] = []

  rawRows.forEach((raw, index) => {
    // Re-key the row by our field names.
    const mapped: Partial<Record<keyof OperatorRecord, unknown>> = {}
    for (const [header, value] of Object.entries(raw)) {
      const field = HEADER_LOOKUP.get(normalizeHeader(header))
      if (field) mapped[field] = value
    }

    const period = parseText(mapped.period)
    const fullName = parseText(mapped.fullName)
    if (!period || !fullName) {
      warnings.push(
        `Řádek ${index + 2} byl přeskočen – chybí období nebo jméno operátora.`,
      )
      return
    }

    const numbers = {} as Record<OperatorMetricKey, number | null>
    for (const metric of NUMERIC_METRICS) {
      numbers[metric] = parseNumber(mapped[metric])
    }

    rows.push({
      period,
      manager: parseText(mapped.manager) || 'Neznámý manager',
      fullName,
      numbers,
    })
  })

  if (rows.length === 0) {
    throw new ImportValidationError(
      'V souboru nebyl nalezen žádný platný řádek s obdobím a jménem operátora.',
    )
  }

  normalizePercentColumns(rows)

  const byPeriod = new Map<string, OperatorRecord[]>()
  for (const row of rows) {
    const record: OperatorRecord = {
      id: `${row.period}::${row.fullName}`,
      period: row.period,
      manager: row.manager,
      fullName: row.fullName,
      ...row.numbers,
    }
    const list = byPeriod.get(row.period) ?? []
    const existingIndex = list.findIndex((r) => r.id === record.id)
    if (existingIndex >= 0) {
      // Duplicate operator within a period keeps the last occurrence.
      list[existingIndex] = record
      warnings.push(
        `Operátor ${row.fullName} je v období ${row.period} uveden vícekrát – použit poslední výskyt.`,
      )
    } else {
      list.push(record)
    }
    byPeriod.set(row.period, list)
  }

  return {
    fileName: file.name,
    periods: [...byPeriod.entries()]
      .map(([period, records]) => ({ period, records }))
      .sort((a, b) => a.period.localeCompare(b.period, 'cs')),
    warnings,
  }
}
