import type { BodyRecord, MetricKey, MetricStats } from '../types/metrics'

export type PeriodKey = '7d' | '30d' | '90d' | '6m' | '1y' | 'all'

export function filterByPeriod(records: BodyRecord[], period: PeriodKey): BodyRecord[] {
  if (period === 'all') return records
  const now = records[records.length - 1]?.date ?? new Date()
  const ms: Record<PeriodKey, number> = {
    '7d': 7, '30d': 30, '90d': 90, '6m': 182, '1y': 365, 'all': 0
  }
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - ms[period])
  return records.filter(r => r.date >= cutoff)
}

export function getValues(records: BodyRecord[], key: MetricKey): { date: Date; value: number }[] {
  return records
    .filter(r => r[key] !== undefined && r[key] !== null)
    .map(r => ({ date: r.date, value: r[key] as number }))
}

export function rollingAverage(values: number[], window: number): number[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  })
}

export function linearSlope(values: number[]): number {
  if (values.length < 2) return 0
  const n = values.length
  const xs = values.map((_, i) => i)
  const xMean = xs.reduce((a, b) => a + b, 0) / n
  const yMean = values.reduce((a, b) => a + b, 0) / n
  const num = xs.reduce((s, x, i) => s + (x - xMean) * (values[i] - yMean), 0)
  const den = xs.reduce((s, x) => s + (x - xMean) ** 2, 0)
  return den === 0 ? 0 : num / den
}

export function volatility(values: number[]): number {
  if (values.length < 2) return 0
  const diffs = values.slice(1).map((v, i) => Math.abs(v - values[i]))
  return diffs.reduce((a, b) => a + b, 0) / diffs.length
}

export function improvementStreak(values: number[], lowerIsBetter: boolean): number {
  let streak = 0
  for (let i = values.length - 1; i > 0; i--) {
    const improved = lowerIsBetter ? values[i] < values[i - 1] : values[i] > values[i - 1]
    if (improved) streak++
    else break
  }
  return streak
}

export function computeMetricStats(
  records: BodyRecord[],
  key: MetricKey,
  lowerIsBetter: boolean
): MetricStats | null {
  const pts = getValues(records, key)
  if (pts.length < 2) return null
  const vals = pts.map(p => p.value)
  const baseline = vals[0]
  const latest = vals[vals.length - 1]
  const absChange = latest - baseline
  const pctChange = baseline !== 0 ? (absChange / Math.abs(baseline)) * 100 : 0

  return {
    key,
    baseline,
    latest,
    absChange,
    pctChange,
    min: Math.min(...vals),
    max: Math.max(...vals),
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    slope: linearSlope(vals),
    volatility: volatility(vals),
    streak: improvementStreak(vals, lowerIsBetter),
    improved: lowerIsBetter ? absChange < 0 : absChange > 0,
  }
}
