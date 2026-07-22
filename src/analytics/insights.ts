import type { BodyRecord, Insight, MetricKey } from '../types/metrics'
import { computeMetricStats, filterByPeriod, getValues } from './engine'
import { METRIC_DEFINITIONS } from '../types/metrics'

function def(key: MetricKey) {
  return METRIC_DEFINITIONS.find(d => d.key === key)!
}

export function generateInsights(records: BodyRecord[]): Insight[] {
  const insights: Insight[] = []
  if (records.length < 5) return insights

  const last30 = filterByPeriod(records, '30d')
  const last90 = filterByPeriod(records, '90d')

  const fatDef = def('bodyFat')
  const muscleDef = def('muscleMass')
  const weightDef = def('weight')

  // Recomposition signal
  const fatStats90 = computeMetricStats(last90, 'bodyFat', true)
  const muscleStats90 = computeMetricStats(last90, 'muscleMass', false)
  if (fatStats90 && muscleStats90) {
    if (fatStats90.improved && muscleStats90.improved) {
      insights.push({
        id: 'recomp-positive',
        type: 'positive',
        title: 'Body Recomposition Detected',
        body: `Over the last 90 days, body fat dropped ${Math.abs(fatStats90.absChange).toFixed(1)}% while muscle mass increased ${muscleStats90.absChange.toFixed(1)} kg — a strong recomposition signal.`,
        metrics: ['bodyFat', 'muscleMass'],
        period: '90 days',
        confidence: last90.length > 20 ? 'high' : 'medium',
      })
    } else if (fatStats90.improved && Math.abs(muscleStats90.absChange) < 0.5) {
      insights.push({
        id: 'fat-loss-preserved',
        type: 'positive',
        title: 'Fat Loss with Muscle Preservation',
        body: `Body fat reduced by ${Math.abs(fatStats90.absChange).toFixed(1)}% over 90 days while muscle mass remained stable (${muscleStats90.absChange.toFixed(1)} kg change). This suggests quality fat loss.`,
        metrics: ['bodyFat', 'muscleMass'],
        period: '90 days',
        confidence: 'medium',
      })
    }
  }

  // Recent momentum vs overall
  const weightAll = computeMetricStats(records, 'weight', true)
  const weight30 = computeMetricStats(last30, 'weight', true)
  if (weightAll && weight30) {
    const recentSlope = weight30.slope
    const overallSlope = weightAll.slope
    if (recentSlope < overallSlope * 0.5 && overallSlope < 0) {
      insights.push({
        id: 'momentum-slowing',
        type: 'concern',
        title: 'Weight Progress Slowing',
        body: `Recent 30-day weight trend (${recentSlope.toFixed(3)} kg/measurement) is slower than your overall trend (${overallSlope.toFixed(3)} kg/measurement). A plateau may be forming.`,
        metrics: ['weight'],
        period: '30 days vs all-time',
        confidence: 'medium',
      })
    } else if (recentSlope < overallSlope && overallSlope < 0) {
      insights.push({
        id: 'momentum-strong',
        type: 'positive',
        title: 'Strong Recent Momentum',
        body: `Your last 30 days show faster progress than your overall average — keep up your current routine.`,
        metrics: ['weight'],
        period: '30 days',
        confidence: 'medium',
      })
    }
  }

  // Consistency insight
  const gapDays: number[] = []
  for (let i = 1; i < records.length; i++) {
    const diff = (records[i].date.getTime() - records[i-1].date.getTime()) / 86400000
    gapDays.push(diff)
  }
  const avgGap = gapDays.reduce((a,b)=>a+b,0) / gapDays.length
  const maxGap = Math.max(...gapDays)
  if (maxGap > 14) {
    insights.push({
      id: 'gap-warning',
      type: 'concern',
      title: 'Measurement Gaps Detected',
      body: `There are gaps up to ${maxGap.toFixed(0)} days between measurements. Consistent tracking improves insight reliability. Average gap: ${avgGap.toFixed(1)} days.`,
      metrics: [],
      period: 'all time',
      confidence: 'high',
    })
  } else {
    insights.push({
      id: 'consistency-good',
      type: 'positive',
      title: 'Consistent Tracking',
      body: `Average measurement gap is ${avgGap.toFixed(1)} days — great consistency. Reliable data means more trustworthy insights.`,
      metrics: [],
      period: 'all time',
      confidence: 'high',
    })
  }

  // Visceral fat
  const vfStats = computeMetricStats(records, 'visceralFat', true)
  if (vfStats && vfStats.improved) {
    insights.push({
      id: 'visceral-improved',
      type: 'positive',
      title: 'Visceral Fat Reduced',
      body: `Visceral fat level dropped from ${vfStats.baseline} to ${vfStats.latest} — a meaningful health marker improvement.`,
      metrics: ['visceralFat'],
      period: 'all time',
      confidence: vfStats.latest !== vfStats.baseline ? 'high' : 'low',
    })
  }

  return insights
}

export function generateEvolutionSummary(
  records: BodyRecord[]
): { start: string; now: string; improved: string; recent: string; attention: string } {
  if (records.length < 2) return { start: '', now: '', improved: '', recent: '', attention: '' }

  const first = records[0]
  const last = records[records.length - 1]
  const startDate = first.date.toLocaleDateString('en-GB', { year:'numeric', month:'long', day:'numeric' })
  const latestDate = last.date.toLocaleDateString('en-GB', { year:'numeric', month:'long', day:'numeric' })
  const daysCovered = Math.round((last.date.getTime() - first.date.getTime()) / 86400000)

  const startStr = `Tracking began on ${startDate} (${daysCovered} days of data). ` +
    (first.weight ? `Starting weight: ${first.weight} kg. ` : '') +
    (first.bodyFat ? `Body fat: ${first.bodyFat}%.` : '')

  const nowStr = `Latest measurement on ${latestDate}. ` +
    (last.weight ? `Weight: ${last.weight} kg. ` : '') +
    (last.bodyFat ? `Body fat: ${last.bodyFat}%.` : '')

  const improvedMetrics: string[] = []
  for (const md of METRIC_DEFINITIONS) {
    const stats = computeMetricStats(records, md.key, md.lowerIsBetter)
    if (stats?.improved) improvedMetrics.push(`${md.label} (${stats.absChange > 0 ? '+' : ''}${stats.absChange.toFixed(1)} ${md.unit})`)
  }
  const improvedStr = improvedMetrics.length
    ? `Metrics that improved since day 1: ${improvedMetrics.join(', ')}.`
    : 'No clear improvements detected yet — keep measuring consistently.'

  const last30 = filterByPeriod(records, '30d')
  const recentLines: string[] = []
  for (const md of METRIC_DEFINITIONS) {
    const stats = computeMetricStats(last30, md.key, md.lowerIsBetter)
    if (stats && Math.abs(stats.pctChange) > 0.5) {
      recentLines.push(`${md.label} ${stats.improved ? '▲ improving' : '▼ regressing'} (${stats.absChange > 0 ? '+' : ''}${stats.absChange.toFixed(1)} ${md.unit})`)
    }
  }
  const recentStr = recentLines.length
    ? `In the last 30 days: ${recentLines.join(', ')}.`
    : 'No significant changes in the last 30 days.'

  const concerns: string[] = []
  for (const md of METRIC_DEFINITIONS) {
    const stats = computeMetricStats(records, md.key, md.lowerIsBetter)
    if (stats && !stats.improved && Math.abs(stats.pctChange) > 2) {
      concerns.push(`${md.label} trended unfavorably (${stats.pctChange.toFixed(1)}% change)`)
    }
  }
  const attentionStr = concerns.length
    ? `Worth monitoring: ${concerns.join('; ')}.`
    : 'No significant concerns detected in current data.'

  return { start: startStr, now: nowStr, improved: improvedStr, recent: recentStr, attention: attentionStr }
}
