import type { BodyRecord } from '../types/metrics'

// ---------------------------------------------------------------------------
// EufyLife CSV export quirks
// ---------------------------------------------------------------------------
// The exported file is NOT a standard CSV. Key problems:
//   1. Rows are concatenated strings like:
//      "2026-07-22 121747claudioferrara936823.00000019.600000..."
//      i.e. date + time + username + all numeric values jammed together.
//   2. Headers are repeated every ~30 rows (pagination artefact).
//   3. Column names are garbled Spanish with diacritics and encoding artifacts:
//      e.g. "%!D(MISSING)E GRASA CORPORAL %" = "% DE GRASA CORPORAL %".
//   4. Some rows contain other family members (e.g. "Vtor") — filter them out
//      unless the user explicitly picks a member.
//   5. Rows with all-zero body composition values = incomplete scan (weight-only).
//   6. European decimal comma may appear in some locales.
// ---------------------------------------------------------------------------

export interface ParseResult {
  records: BodyRecord[]
  skipped: number
  warnings: string[]
  detectedColumns: string[]
  members: string[]
}

// ---------------------------------------------------------------------------
// Column index constants — positional order in the EufyLife export
// Based on the known header:
//   0  Hora
//   1  Miembros de la familia
//   2  PESO kg
//   3  IMC  (garbled: "IMC!D(MISSING)E GRASA CORPORAL" etc.)
//   4  % GRASA CORPORAL
//   5  FRECUENCIA CARDÍACA bpm
//   6  MASA MUSCULAR kg
//   7  % DE MASA MUSCULAR
//   8  MBAGUA  (Body Water %)
//   9  MASA GRASA CORPORAL kg
//   10 MASA MAGRA CORPORAL kg
//   11 MASA ÓSEA kg
//   12 % DE MASA ÓSEA
//   13 GRASA VISCERAL
//   14 PROTEÍNA %
//   15 MASA DE MÚsCULO ESQUELÉTICO kg
//   16 % GRASA SUBCUTÁNEA
//   17 EDAD DEL CUERPO
//   18 TIPO DE CUERPO
//   19 TAMAÑO DE LA CABEZA cm
// ---------------------------------------------------------------------------

const DELIMITERS = [';', '\t', ',']

function detectDelimiter(line: string): string | null {
  for (const d of DELIMITERS) {
    if ((line.match(new RegExp(`\\${d}`, 'g')) ?? []).length >= 3) return d
  }
  return null
}

/** Remove accents/diacritics, strip junk chars, lowercase, collapse spaces */
function normaliseHeader(h: string): string {
  return h
    .replace(/\uFEFF/g, '')          // BOM
    .replace(/[\u200B-\u200D]/g, '') // zero-width chars
    .replace(/[!()%]/g, ' ')         // punctuation that appears in garbled headers
    .replace(/["']/g, '')
    .trim()
    // NFD decomposition splits letter+accent into two codepoints;
    // then we strip the combining-accent codepoints (U+0300–U+036F)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function parseNum(v: string): number | undefined {
  if (!v) return undefined
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? undefined : n
}

function parseDate(dateStr: string, timeStr: string): Date {
  const hh = timeStr.slice(0, 2)
  const mm = timeStr.slice(2, 4)
  const ss = timeStr.slice(4, 6)
  return new Date(`${dateStr}T${hh}:${mm}:${ss}`)
}

function isHeaderOrSeparator(line: string): boolean {
  const l = line.toLowerCase()
  return (
    l.includes('hora') ||
    l.includes('miembros') ||
    l.includes('peso kg') ||
    l.includes('weight') ||
    /^[-\s]+$/.test(line) ||
    line.trim() === ''
  )
}

function extractConcatenatedTokens(raw: string): string[] {
  const sixDecRe = /(-?\d+\.\d{6}|-?\d+)/g
  const tokens: string[] = []
  let m: RegExpExecArray | null
  while ((m = sixDecRe.exec(raw)) !== null) tokens.push(m[0])
  if (tokens.length < 3) return raw.trim().split(/[\s,;]+/)
  return tokens
}

const TOKEN_POSITIONS: Array<[number, keyof BodyRecord]> = [
  [0,  'weight'],
  [1,  'bmi'],
  [2,  'bodyFat'],
  [3,  'heartRate'],
  [4,  'muscleMass'],
  [5,  'muscleMassPct'],
  [6,  'bodyWater'],
  [7,  'bodyFatMass'],
  [8,  'leanBodyMass'],
  [9,  'boneMass'],
  [10, 'boneMassPct'],
  [11, 'visceralFat'],
  [12, 'proteinPct'],
  [13, 'skeletalMuscleMass'],
  [14, 'subcutaneousFatPct'],
  [15, 'bodyAge'],
]

function tokensToRecord(tokens: string[]): Partial<BodyRecord> {
  const r: Partial<BodyRecord> = {}
  for (const [pos, field] of TOKEN_POSITIONS) {
    const v = tokens[pos]
    if (v === undefined) continue
    const n = parseNum(v)
    if (n !== undefined && n !== 0) {
      ;(r as Record<string, unknown>)[field] = n
    }
  }
  if (tokens[16] && !/^0\./.test(tokens[16]) && isNaN(Number(tokens[16]))) {
    r.bodyType = tokens[16]
  }
  return r
}

// ---------------------------------------------------------------------------
// COLUMN_MAP: keys are normalised (diacritics stripped, lowercase, spaces collapsed).
// Because normaliseHeader() now strips accents via NFD, we only need the
// accent-free forms here. Garbled header variants are also included.
// ---------------------------------------------------------------------------
const COLUMN_MAP: Record<string, keyof BodyRecord> = {
  // Date / member
  'hora': 'date', 'date': 'date', 'time': 'date', 'measurement date': 'date',
  'miembros de la familia': 'familyMember', 'family member': 'familyMember',

  // Weight
  'peso kg': 'weight', 'peso': 'weight', 'weight': 'weight', 'weight kg': 'weight',

  // BMI — also catches garbled forms like "%!D(MISSING)E GRASA CORPORAL"
  'imc': 'bmi', 'bmi': 'bmi',
  'imc d missing e grasa corporal': 'bmi',  // garbled: "IMC!D(MISSING)E GRASA CORPORAL"
  'd missing e grasa corporal': 'bmi',       // partial garble

  // Body fat %
  'grasa corporal': 'bodyFat',
  'body fat': 'bodyFat', 'fat': 'bodyFat',
  'd missing e grasa corporal ': 'bodyFat',  // garbled "%!D(MISSING)E GRASA CORPORAL %"
  'd missing e grasa corporal  ': 'bodyFat',
  // accent-stripped forms (after NFD)
  'grasa corporal ': 'bodyFat',              // trailing space variant

  // Heart rate — FRECUENCIA CARDÍACA → after strip: "frecuencia cardiaca"
  'frecuencia cardiaca bpm': 'heartRate',
  'frecuencia cardiaca  bpm ': 'heartRate',
  'frecuencia cardiaca': 'heartRate',
  'heart rate': 'heartRate', 'heart rate bpm': 'heartRate',

  // Muscle mass — MASA MUSCULAR
  'masa muscular kg': 'muscleMass', 'muscle mass': 'muscleMass', 'muscle mass kg': 'muscleMass',
  'masa muscular': 'muscleMass',
  '  de masa muscular': 'muscleMassPct',       // "% DE MASA MUSCULAR" → strip % → " de masa muscular"
  'de masa muscular': 'muscleMassPct',
  'muscle  ': 'muscleMassPct',

  // Body water — MBAGUA (garbled "MB AGUA" / "% AGUA")
  'mbagua': 'bodyWater', 'agua': 'bodyWater', 'body water': 'bodyWater',
  'mb agua': 'bodyWater', ' agua': 'bodyWater',

  // Fat mass / lean mass
  'masa grasa corporal kg': 'bodyFatMass', 'fat mass kg': 'bodyFatMass',
  'masa magra corporal kg': 'leanBodyMass', 'lean body mass': 'leanBodyMass',

  // Bone mass — MASA ÓSEA → after NFD strip: "masa osea"
  'masa osea kg': 'boneMass', 'bone mass': 'boneMass', 'bone mass kg': 'boneMass',
  'masa osea': 'boneMass',
  'de masa osea': 'boneMassPct',              // "% DE MASA ÓSEA" → strip % → " de masa osea"
  ' de masa osea': 'boneMassPct',

  // Visceral fat
  'grasa visceral': 'visceralFat', 'visceral fat': 'visceralFat',

  // Protein — PROTEÍNA → after NFD: "proteina"
  'proteina': 'proteinPct', 'protein': 'proteinPct', 'protein ': 'proteinPct',
  ' proteina': 'proteinPct',

  // Skeletal muscle — MASA DE MÚsCULO ESQUELÉTICO → "masa de musculo esqueletico"
  'masa de musculo esqueletico kg': 'skeletalMuscleMass',
  'masa de musculo esqueletico': 'skeletalMuscleMass',
  'skeletal muscle mass': 'skeletalMuscleMass',

  // Subcutaneous fat — % GRASA SUBCUTÁNEA → "grasa subcutanea"
  'grasa subcutanea': 'subcutaneousFatPct',
  ' grasa subcutanea': 'subcutaneousFatPct',  // leading space from % strip
  'subcutaneous fat': 'subcutaneousFatPct',

  // Body age / type
  'edad del cuerpo': 'bodyAge', 'body age': 'bodyAge',
  'tipo de cuerpo': 'bodyType', 'body type': 'bodyType',

  // Head size — TAMAÑO DE LA CABEZA → "tamano de la cabeza"
  'tamano de la cabeza cm': 'headSize',
  'tamano de la cabeza': 'headSize',
  'head size cm': 'headSize', 'head size': 'headSize',

  // Body measurements
  'biceps cm': 'bicepsCm', 'pecho cm': 'chestCm',
  'cintura cm': 'waistCm', 'waist cm': 'waistCm',
  'cadera cm': 'hipCm',
  'muslos cm': 'thighCm',
  'relacion cintura-cadera': 'waistHipRatio',

  // BMR
  'mb': 'bmr', 'bmr': 'bmr', 'mba': 'bmr',
}

const STRING_FIELDS = new Set<keyof BodyRecord>(['bodyType', 'familyMember'])

function parseDateStr(val: string): Date | null {
  const clean = val.trim()
  if (!clean) return null
  const iso = new Date(clean)
  if (!isNaN(iso.getTime())) return iso
  const dmy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

function splitCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === delimiter && !inQuotes) { result.push(current); current = '' }
    else { current += ch }
  }
  result.push(current)
  return result
}

function parseDelimited(lines: string[], delimiter: string): ParseResult {
  const rawHeaders = lines[0].split(delimiter)
  const headers = rawHeaders.map(normaliseHeader)
  const colMap: Record<number, keyof BodyRecord> = {}
  const warnings: string[] = []
  const unmapped: string[] = []

  headers.forEach((h, i) => {
    const mapped = COLUMN_MAP[h]
    if (mapped) {
      colMap[i] = mapped
    } else if (h && h.length > 1) {
      // Try a trimmed version (extra spaces can appear after stripping % signs)
      const trimmed = h.trim()
      const trimMapped = COLUMN_MAP[trimmed]
      if (trimMapped) {
        colMap[i] = trimMapped
      } else {
        unmapped.push(rawHeaders[i].trim())
      }
    }
  })

  if (unmapped.length) {
    warnings.push(`Unrecognised columns (ignored): ${unmapped.join(', ')}`)
  }
  if (!Object.values(colMap).includes('date')) {
    warnings.push('⚠️ No date column found.')
  }

  const records: BodyRecord[] = []
  let skipped = 0
  const members = new Set<string>()

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cols = splitCSVLine(line, delimiter)
    const record: Partial<BodyRecord> = {}

    for (const [idxStr, field] of Object.entries(colMap)) {
      const idx = Number(idxStr)
      const val = (cols[idx] ?? '').trim().replace(/["']/g, '')
      if (!val || val === '-' || val === 'N/A') continue

      if (field === 'date') {
        const d = parseDateStr(val)
        if (d) record.date = d
      } else if (STRING_FIELDS.has(field)) {
        (record as Record<string, unknown>)[field] = val
        if (field === 'familyMember') members.add(val)
      } else {
        const n = parseNum(val)
        if (n !== undefined && n !== 0) { (record as Record<string, unknown>)[field] = n }
      }
    }

    if (!record.date) { skipped++; continue }
    records.push(record as BodyRecord)
  }

  return {
    records: deduplicateByTimestamp(
      records.sort((a, b) => a.date.getTime() - b.date.getTime())
    ),
    skipped,
    warnings,
    detectedColumns: [...new Set(Object.values(colMap).filter(v => v !== 'date' && v !== 'familyMember'))] as string[],
    members: [...members],
  }
}

// ---------------------------------------------------------------------------
// Concatenated-row parser (primary path for real EufyLife exports)
// ---------------------------------------------------------------------------
function parseConcatenated(lines: string[]): ParseResult {
  const warnings: string[] = []
  const allRecords: BodyRecord[] = []
  let skipped = 0
  const members = new Set<string>()

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || isHeaderOrSeparator(line)) continue

    const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{6})(.*)/)
    if (!dateMatch) { skipped++; continue }

    const dateStr = dateMatch[1]
    const timeStr = dateMatch[2]
    let rest      = dateMatch[3]

    let familyMember = ''
    const usernameMatch = rest.match(/^([a-zA-Z][\w]*?)(?=(\d{2,3}\.\d{6}|\d{2,3}\d{6}))/)
    if (usernameMatch) {
      familyMember = usernameMatch[1]
      rest = rest.slice(familyMember.length)
    } else {
      const alphaMatch = rest.match(/^([a-zA-Z]+)/)
      if (alphaMatch) {
        familyMember = alphaMatch[1]
        rest = rest.slice(familyMember.length)
      }
    }

    members.add(familyMember)

    const date   = parseDate(dateStr, timeStr)
    const tokens = extractConcatenatedTokens(rest)
    const partial = tokensToRecord(tokens)

    if (!partial.weight) { skipped++; continue }

    allRecords.push({ date, familyMember, ...partial } as BodyRecord)
  }

  if (allRecords.length === 0) {
    warnings.push('No valid records found in concatenated format.')
  }

  const detectedColumns = TOKEN_POSITIONS
    .filter(([pos]) => allRecords.some(r => r[TOKEN_POSITIONS.find(t => t[0] === pos)![1]] !== undefined))
    .map(([, field]) => field as string)

  return {
    records: deduplicateByTimestamp(
      allRecords.sort((a, b) => a.date.getTime() - b.date.getTime())
    ),
    skipped,
    warnings,
    detectedColumns,
    members: [...members],
  }
}

// ---------------------------------------------------------------------------
// Deduplicate: when multiple measurements exist within 60 seconds,
// keep the one with the most complete data (most non-undefined fields).
// ---------------------------------------------------------------------------
function deduplicateByTimestamp(records: BodyRecord[]): BodyRecord[] {
  const WINDOW_MS = 60_000
  const out: BodyRecord[] = []
  let i = 0
  while (i < records.length) {
    let j = i + 1
    while (j < records.length && records[j].date.getTime() - records[i].date.getTime() < WINDOW_MS) j++
    const group = records.slice(i, j)
    const best = group.reduce((a, b) =>
      Object.values(b).filter(v => v !== undefined).length >
      Object.values(a).filter(v => v !== undefined).length ? b : a
    )
    out.push(best)
    i = j
  }
  return out
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export function parseCSV(csv: string, filterMember?: string): ParseResult {
  const lines = csv.trim().split(/\r?\n/)
  if (lines.length < 2) {
    return { records: [], skipped: 0, warnings: ['File appears empty'], detectedColumns: [], members: [] }
  }

  const firstDataLine = lines.find(l => /^\d{4}-\d{2}-\d{2}/.test(l.trim())) ?? ''
  const delimiter = detectDelimiter(lines[0])

  let result: ParseResult

  if (!delimiter && /^\d{4}-\d{2}-\d{2}\s+\d{6}/.test(firstDataLine)) {
    result = parseConcatenated(lines)
  } else if (delimiter) {
    result = parseDelimited(lines, delimiter)
  } else {
    result = parseConcatenated(lines)
    if (result.records.length === 0) {
      result.warnings.push('Could not detect CSV format. Please check the file.')
    }
  }

  if (filterMember) {
    const before = result.records.length
    result.records = result.records.filter(r => r.familyMember === filterMember)
    const dropped = before - result.records.length
    if (dropped > 0) {
      result.warnings.push(`Filtered to "${filterMember}" — ${dropped} records from other members excluded.`)
    }
  }

  return result
}
