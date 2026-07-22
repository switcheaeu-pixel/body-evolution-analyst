import type { BodyRecord } from '../types/metrics'

const COLUMN_MAP: Record<string, keyof BodyRecord> = {
  'date': 'date',
  'time': 'date',
  'measurement date': 'date',
  'weight': 'weight',
  'weight(kg)': 'weight',
  'body fat': 'bodyFat',
  'body fat(%)': 'bodyFat',
  'fat%': 'bodyFat',
  'fat ratio': 'bodyFat',
  'muscle mass': 'muscleMass',
  'muscle mass(kg)': 'muscleMass',
  'muscle': 'muscleMass',
  'bmi': 'bmi',
  'visceral fat': 'visceralFat',
  'visceral fat level': 'visceralFat',
  'body water': 'bodyWater',
  'body water(%)': 'bodyWater',
  'water%': 'bodyWater',
  'bone mass': 'boneMass',
  'bone mass(kg)': 'boneMass',
  'bmr': 'bmr',
  'bmr(kcal)': 'bmr',
}

function parseDate(val: string): Date | null {
  const clean = val.trim()
  // Try ISO first
  const iso = new Date(clean)
  if (!isNaN(iso.getTime())) return iso
  // Try DD/MM/YYYY
  const dmy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (dmy) return new Date(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`)
  return null
}

export interface ParseResult {
  records: BodyRecord[]
  skipped: number
  warnings: string[]
}

export function parseCSV(csv: string): ParseResult {
  const lines = csv.trim().split(/\r?\n/)
  if (lines.length < 2) return { records: [], skipped: 0, warnings: ['File appears empty'] }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''))
  const columnMapping: Record<number, keyof BodyRecord> = {}
  const warnings: string[] = []

  headers.forEach((h, i) => {
    const mapped = COLUMN_MAP[h]
    if (mapped) columnMapping[i] = mapped
  })

  if (!Object.values(columnMapping).includes('date')) {
    warnings.push('No date column detected. Ensure your CSV has a date/time column.')
  }

  const records: BodyRecord[] = []
  let skipped = 0

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cols = line.split(',').map(c => c.trim().replace(/["']/g, ''))
    const record: Partial<BodyRecord> = {}

    for (const [idxStr, field] of Object.entries(columnMapping)) {
      const idx = Number(idxStr)
      const val = cols[idx]
      if (!val || val === '-' || val === 'N/A') continue
      if (field === 'date') {
        const d = parseDate(val)
        if (d) record.date = d
      } else {
        const num = parseFloat(val)
        if (!isNaN(num)) (record as Record<string, unknown>)[field] = num
      }
    }

    if (!record.date) { skipped++; continue }
    records.push(record as BodyRecord)
  }

  return { records: records.sort((a, b) => a.date.getTime() - b.date.getTime()), skipped, warnings }
}
