import type { BodyRecord } from '../types/metrics'

// Normalise a header: lowercase, collapse whitespace, strip BOM/invisible chars
function normaliseHeader(h: string): string {
  return h
    .replace(/\uFEFF/g, '')          // BOM
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')           // collapse multiple spaces
    .replace(/["']/g, '')
}

/**
 * Maps every known EufyLife column header (English + Spanish) to a BodyRecord key.
 * Spanish headers come from the two exported file formats:
 *   File 1 – body measurements (circumferences)
 *   File 2 – body composition (scale data)
 */
const COLUMN_MAP: Record<string, keyof BodyRecord> = {
  // ── Date / time ────────────────────────────────────────────────────────────
  'date':                         'date',
  'time':                         'date',
  'hora':                         'date',  // ES: "Hora"
  'time miembros de la familia':  'date',  // ES file 1 first col sometimes merged
  'measurement date':             'date',

  // ── Weight ─────────────────────────────────────────────────────────────────
  'weight':                       'weight',
  'weight(kg)':                   'weight',
  'peso (kg)':                    'weight',  // ES
  'peso(kg)':                     'weight',

  // ── Body Fat ───────────────────────────────────────────────────────────────
  'body fat':                     'bodyFat',
  'body fat(%)':                  'bodyFat',
  'fat%':                         'bodyFat',
  'fat ratio':                    'bodyFat',
  // ES: "% DE GRASA CORPORAL" — EufyLife exports this with a garbled encoding
  '% de grasa corporal':          'bodyFat',
  '%!d(missing)e grasa corporal %': 'bodyFat', // literal garbled export string
  '% grasa corporal':             'bodyFat',
  'grasa corporal (%)':           'bodyFat',
  'masa grasa corporal (kg)':     'bodyFatMass',

  // ── Muscle Mass ────────────────────────────────────────────────────────────
  'muscle mass':                  'muscleMass',
  'muscle mass(kg)':              'muscleMass',
  'muscle':                       'muscleMass',
  'masa muscular (kg)':           'muscleMass',  // ES
  'masa muscular(kg)':            'muscleMass',
  'masa de músculo esquelético (kg)': 'skeletalMuscleMass',
  'masa de musculo esqueletico (kg)': 'skeletalMuscleMass',
  '% de masa muscular':           'muscleMassPct',
  '% masa muscular':              'muscleMassPct',

  // ── Lean Body Mass ─────────────────────────────────────────────────────────
  'masa magra corporal (kg)':     'leanBodyMass',
  'lean body mass':               'leanBodyMass',

  // ── BMI ────────────────────────────────────────────────────────────────────
  'bmi':                          'bmi',
  'imc':                          'bmi',  // ES: Índice de Masa Corporal

  // ── Visceral Fat ───────────────────────────────────────────────────────────
  'visceral fat':                 'visceralFat',
  'visceral fat level':           'visceralFat',
  'grasa visceral':               'visceralFat',  // ES

  // ── Body Water ─────────────────────────────────────────────────────────────
  'body water':                   'bodyWater',
  'body water(%)':                'bodyWater',
  'water%':                       'bodyWater',
  'agua':                         'bodyWater',  // ES: "AGUA"
  'mbagua':                       'bodyWater',  // merged col artefact

  // ── Bone Mass ──────────────────────────────────────────────────────────────
  'bone mass':                    'boneMass',
  'bone mass(kg)':                'boneMass',
  'masa ósea (kg)':               'boneMass',  // ES
  'masa osea (kg)':               'boneMass',
  '% de masa ósea':               'boneMassPct',
  '% de masa osea':               'boneMassPct',

  // ── BMR ────────────────────────────────────────────────────────────────────
  'bmr':                          'bmr',
  'bmr(kcal)':                    'bmr',
  'mba':                          'bmr',  // some locales abbreviate BMR as MBA

  // ── Heart Rate ─────────────────────────────────────────────────────────────
  'frecuencia cardíaca (bpm)':    'heartRate',
  'frecuencia cardiaca (bpm)':    'heartRate',
  'heart rate':                   'heartRate',
  'heart rate (bpm)':             'heartRate',

  // ── Protein ────────────────────────────────────────────────────────────────
  '% proteína':                   'proteinPct',
  '% proteina':                   'proteinPct',
  'protein%':                     'proteinPct',

  // ── Subcutaneous Fat ───────────────────────────────────────────────────────
  '% grasa subcutánea':           'subcutaneousFatPct',
  '% grasa subcutanea':           'subcutaneousFatPct',
  'subcutaneous fat%':            'subcutaneousFatPct',

  // ── Body Age / Type ────────────────────────────────────────────────────────
  'edad del cuerpo':              'bodyAge',
  'body age':                     'bodyAge',
  'tipo de cuerpo':               'bodyType',  // string, handled separately
  'body type':                    'bodyType',

  // ── Head Size ──────────────────────────────────────────────────────────────
  'tamaño de la cabeza (cm)':     'headSize',
  'head size (cm)':               'headSize',

  // ── Circumference measurements (File 1) ────────────────────────────────────
  'bíceps (cm)':                  'bicepsCm',
  'biceps (cm)':                  'bicepsCm',
  'pecho (cm)':                   'chestCm',
  'chest (cm)':                   'chestCm',
  'cintura (cm)':                 'waistCm',
  'waist (cm)':                   'waistCm',
  'cadera (cm)':                  'hipCm',
  'hip (cm)':                     'hipCm',
  'muslos (cm)':                  'thighCm',
  'thigh (cm)':                   'thighCm',
  'relación cintura-cadera':      'waistHipRatio',
  'relacion cintura-cadera':      'waistHipRatio',
  'waist-hip ratio':              'waistHipRatio',
  'waist hip ratio':              'waistHipRatio',

  // ── Family member (ignored, but mapped to avoid unknown-column warnings) ───
  'miembros de la familia':       'familyMember',
  'family member':                'familyMember',
}

// Columns that are plain strings (not numbers)
const STRING_FIELDS = new Set<keyof BodyRecord>(['bodyType', 'familyMember'])

function parseDate(val: string): Date | null {
  const clean = val.trim()
  if (!clean) return null
  // ISO 8601
  const iso = new Date(clean)
  if (!isNaN(iso.getTime())) return iso
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`)
    if (!isNaN(d.getTime())) return d
  }
  // YYYY/MM/DD
  const ymd = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
  if (ymd) {
    const d = new Date(`${ymd[1]}-${ymd[2].padStart(2,'0')}-${ymd[3].padStart(2,'0')}`)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

// Detect delimiter: comma or semicolon (EufyLife ES exports use semicolons)
function detectDelimiter(firstLine: string): string {
  const commas    = (firstLine.match(/,/g) ?? []).length
  const semicolons = (firstLine.match(/;/g) ?? []).length
  return semicolons > commas ? ';' : ','
}

export interface ParseResult {
  records:   BodyRecord[]
  skipped:   number
  warnings:  string[]
  detectedColumns: string[]
}

export function parseCSV(csv: string): ParseResult {
  const lines = csv.trim().split(/\r?\n/)
  if (lines.length < 2) return { records: [], skipped: 0, warnings: ['File appears empty'], detectedColumns: [] }

  const delimiter = detectDelimiter(lines[0])
  const rawHeaders = lines[0].split(delimiter)
  const headers = rawHeaders.map(normaliseHeader)
  const columnMapping: Record<number, keyof BodyRecord> = {}
  const warnings: string[] = []
  const unmapped: string[] = []

  headers.forEach((h, i) => {
    const mapped = COLUMN_MAP[h]
    if (mapped) {
      columnMapping[i] = mapped
    } else if (h && h !== '') {
      unmapped.push(rawHeaders[i].trim())
    }
  })

  if (unmapped.length > 0) {
    warnings.push(`Unrecognised columns (ignored): ${unmapped.join(', ')}`)
  }

  if (!Object.values(columnMapping).includes('date')) {
    warnings.push('⚠️ No date column detected. Check that your CSV has a "Hora", "Date" or "Time" column.')
  }

  const records: BodyRecord[] = []
  let skipped = 0

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Split respecting quoted fields
    const cols = splitCSVLine(line, delimiter)
    const record: Partial<BodyRecord> = {}

    for (const [idxStr, field] of Object.entries(columnMapping)) {
      const idx = Number(idxStr)
      const val = (cols[idx] ?? '').trim().replace(/["']/g, '')
      if (!val || val === '-' || val === 'N/A' || val === '--') continue

      if (field === 'date') {
        const d = parseDate(val)
        if (d) record.date = d
      } else if (STRING_FIELDS.has(field)) {
        ;(record as Record<string, unknown>)[field] = val
      } else {
        // Replace comma decimal separator (European locales: "24,8" → "24.8")
        const normalised = val.replace(',', '.')
        const num = parseFloat(normalised)
        if (!isNaN(num)) { (record as Record<string, unknown>)[field] = num }
      }
    }

    if (!record.date) { skipped++; continue }
    records.push(record as BodyRecord)
  }

  const detectedColumns = Object.values(columnMapping)
    .filter(v => v !== 'date' && v !== 'familyMember') as string[]

  return {
    records:  records.sort((a, b) => a.date.getTime() - b.date.getTime()),
    skipped,
    warnings,
    detectedColumns,
  }
}

/** Split a CSV line respecting double-quoted fields */
function splitCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === delimiter && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}
