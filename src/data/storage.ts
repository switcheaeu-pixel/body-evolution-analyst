import type { BodyRecord } from '../types/metrics'

const STORAGE_KEY = 'body-evolution-records'

export function loadRecords(): BodyRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((r: Record<string, unknown>) => ({
      ...r,
      date: new Date(r.date as string),
    }))
  } catch {
    return []
  }
}

export function saveRecords(records: BodyRecord[]): void {
  try {
    const copy = records.map(r => ({ ...r, date: r.date.toISOString() }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function clearRecords(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function mergeRecords(existing: BodyRecord[], incoming: BodyRecord[]): BodyRecord[] {
  const dateMap = new Map<string, BodyRecord>()

  for (const r of existing) {
    const key = r.date.toISOString().slice(0, 10) + (r.familyMember ? `|${r.familyMember}` : '')
    dateMap.set(key, r)
  }

  for (const r of incoming) {
    const key = r.date.toISOString().slice(0, 10) + (r.familyMember ? `|${r.familyMember}` : '')
    dateMap.set(key, r)
  }

  return Array.from(dateMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime())
}

export function getMergeDiff(existing: BodyRecord[], incoming: BodyRecord[]): { added: number; updated: number } {
  const existingKeys = new Set(
    existing.map(r => r.date.toISOString().slice(0, 10) + (r.familyMember ? `|${r.familyMember}` : ''))
  )
  let added = 0
  let updated = 0
  for (const r of incoming) {
    const key = r.date.toISOString().slice(0, 10) + (r.familyMember ? `|${r.familyMember}` : '')
    if (existingKeys.has(key)) {
      updated++
    } else {
      added++
    }
  }
  return { added, updated }
}
