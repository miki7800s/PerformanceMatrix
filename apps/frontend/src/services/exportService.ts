import * as XLSX from 'xlsx'
import { COLUMN_MAP, type OperatorRecord } from '@care-dashboard/shared'

/**
 * Local-only exports: files are generated in the browser and offered
 * as downloads — no network involved.
 */

/** Record → row keyed by the original Power BI headers. */
function toExportRow(record: OperatorRecord): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [header, field] of Object.entries(COLUMN_MAP)) {
    row[header] = record[field] ?? null
  }
  return row
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.-]+/g, '_')
}

/** Exports records back to an Excel file with the original columns. */
export function exportToExcel(records: OperatorRecord[], fileName: string) {
  const ws = XLSX.utils.json_to_sheet(records.map(toExportRow))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Report')
  XLSX.writeFile(wb, `${sanitizeFileName(fileName)}.xlsx`)
}

/** Exports records to CSV (UTF-8 with BOM so Excel opens it correctly). */
export function exportToCsv(records: OperatorRecord[], fileName: string) {
  const ws = XLSX.utils.json_to_sheet(records.map(toExportRow))
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';' })
  const blob = new Blob(['\uFEFF', csv], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${sanitizeFileName(fileName)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * PDF export via the browser print dialog (Save as PDF). Print CSS in
 * index.css hides navigation and controls, so only the page content
 * is printed.
 */
export function exportToPdf() {
  window.print()
}

/** Exports arbitrary rows (e.g. the matrix dataset) to Excel. */
export function exportRowsToExcel(
  rows: Record<string, unknown>[],
  fileName: string,
  sheetName = 'Data',
) {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${sanitizeFileName(fileName)}.xlsx`)
}

/**
 * Renders an SVG chart (e.g. the Recharts surface) into a PNG download.
 * Runs fully in the browser: serialize SVG → draw on canvas → download.
 */
export async function exportSvgToPng(
  svg: SVGSVGElement,
  fileName: string,
  background: string,
): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const { width, height } = svg.getBoundingClientRect()
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  // Chart text inherits page styles; pin a font so the PNG matches.
  clone.setAttribute(
    'style',
    "font-family: system-ui, -apple-system, 'Segoe UI', sans-serif",
  )

  const markup = new XMLSerializer().serializeToString(clone)
  const svgUrl = URL.createObjectURL(
    new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }),
  )
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('SVG se nepodařilo vykreslit.'))
      img.src = svgUrl
    })

    const scale = 2 // retina-quality export
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas není k dispozici.')
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Export PNG selhal.'))),
        'image/png',
      )
    })
    const pngUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = pngUrl
    link.download = `${sanitizeFileName(fileName)}.png`
    link.click()
    URL.revokeObjectURL(pngUrl)
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}
