import type { BodyRecord, Insight, MetricKey } from '../types/metrics'
import { computeMetricStats, filterByPeriod, getValues, linearSlope } from './engine'
import { METRIC_DEFINITIONS } from '../types/metrics'

function def(key: MetricKey) {
  return METRIC_DEFINITIONS.find(d => d.key === key)!
}

function classifyBMI(bmi: number): { category: string; risk: 'positive' | 'neutral' | 'concern' } {
  if (bmi < 18.5) return { category: 'Underweight', risk: 'concern' }
  if (bmi < 25)   return { category: 'Normal weight', risk: 'positive' }
  if (bmi < 30)   return { category: 'Overweight', risk: 'concern' }
  return { category: 'Obese', risk: 'concern' }
}

function classifyWHR(whr: number): { category: string; risk: 'positive' | 'neutral' | 'concern' } {
  if (whr < 0.85) return { category: 'Low risk', risk: 'positive' }
  if (whr < 0.95) return { category: 'Moderate risk', risk: 'neutral' }
  return { category: 'High risk', risk: 'concern' }
}

function classifyBodyFat(bf: number): { category: string; risk: 'positive' | 'neutral' | 'concern' } {
  if (bf < 15) return { category: 'Athletic', risk: 'positive' }
  if (bf < 20) return { category: 'Fit', risk: 'positive' }
  if (bf < 25) return { category: 'Average', risk: 'neutral' }
  if (bf < 32) return { category: 'Above average', risk: 'concern' }
  return { category: 'High', risk: 'concern' }
}

function classifyBodyWater(bw: number): { category: string; risk: 'positive' | 'neutral' | 'concern' } {
  if (bw < 45) return { category: 'Low', risk: 'concern' }
  if (bw < 50) return { category: 'Below normal', risk: 'neutral' }
  if (bw <= 65) return { category: 'Normal', risk: 'positive' }
  return { category: 'High', risk: 'neutral' }
}

function weeklyRate(values: number[], daysSpan: number): number {
  if (values.length < 2 || daysSpan === 0) return 0
  const slope = linearSlope(values)
  return (slope * values.length) / (daysSpan / 7)
}

export function generateInsights(records: BodyRecord[]): Insight[] {
  const insights: Insight[] = []
  if (records.length < 3) return insights

  const last30 = filterByPeriod(records, '30d')
  const last90 = filterByPeriod(records, '90d')

  const daysSpan = Math.round((records[records.length - 1].date.getTime() - records[0].date.getTime()) / 86400000)

  // === Weight insights ===
  const wtStats = computeMetricStats(records, 'weight', true)
  const wt30 = computeMetricStats(last30, 'weight', true)
  if (wtStats && records.some(r => r.weight !== undefined)) {
    const rate = weeklyRate(getValues(records, 'weight').map(p => p.value), daysSpan)
    const rateAbs = Math.abs(rate)

    if (rateAbs > 0.05 && daysSpan > 14) {
      const dir = rate < 0 ? 'losing' : 'gaining'
      const pace = rateAbs < 0.3 ? 'slowly' : rateAbs < 0.7 ? 'steadily' : 'rapidly'
      const ctype = rate < 0 ? 'positive' : 'concern'
      insights.push({
        id: 'weight-rate',
        type: ctype as 'positive' | 'concern',
        title: `Weight ${dir.charAt(0).toUpperCase() + dir.slice(1)} ${pace}`,
        body: `Trending at ~${rateAbs.toFixed(2)} kg/week over ${daysSpan} days. ${rateAbs > 1 ? 'Rate exceeds the recommended 0.5–1 kg/week for sustainable change.' : 'Rate is within sustainable range.'}`,
        metrics: ['weight'],
        period: 'all time',
        confidence: records.length > 10 ? 'high' : 'medium',
      })
    }
  }

  // === BMI classification ===
  const bmiStats = computeMetricStats(records, 'bmi', true)
  if (bmiStats && records.some(r => r.bmi !== undefined)) {
    const bmiClass = classifyBMI(bmiStats.latest)
    insights.push({
      id: 'bmi-class',
      type: bmiClass.risk,
      title: `BMI Classification: ${bmiClass.category}`,
      body: bmiStats.improved
        ? `Current BMI is ${bmiStats.latest.toFixed(1)}. Trending down from ${bmiStats.baseline.toFixed(1)}. Moving in a healthy direction.`
        : `Current BMI is ${bmiStats.latest.toFixed(1)}. Started at ${bmiStats.baseline.toFixed(1)}. ${bmiClass.risk === 'concern' ? 'Weight management could improve health markers.' : 'Maintaining this range is beneficial.'}`,
      metrics: ['bmi', 'weight'],
      period: 'all time',
      confidence: 'high',
    })
  }

  // === Body Fat classification ===
  const bfStats = computeMetricStats(records, 'bodyFat', true)
  if (bfStats && records.some(r => r.bodyFat !== undefined)) {
    const bfClass = classifyBodyFat(bfStats.latest)
    insights.push({
      id: 'bf-class',
      type: bfClass.risk,
      title: `Body Fat: ${bfClass.category}`,
      body: `Current body fat is ${bfStats.latest.toFixed(1)}%. Changed ${bfStats.absChange > 0 ? '+' : ''}${bfStats.absChange.toFixed(1)}% from ${bfStats.baseline.toFixed(1)}%. ${bfStats.improved ? 'Trending in the right direction.' : 'Consider adjusting nutrition or exercise to shift this trend.'}`,
      metrics: ['bodyFat'],
      period: 'all time',
      confidence: records.length > 5 ? 'high' : 'medium',
    })
  }

  // === Waist-to-Hip Ratio ===
  const whrStats = computeMetricStats(records, 'waistHipRatio', true)
  if (whrStats && records.some(r => r.waistHipRatio !== undefined)) {
    const whrClass = classifyWHR(whrStats.latest)
    insights.push({
      id: 'whr-class',
      type: whrClass.risk,
      title: `Waist/Hip Ratio: ${whrClass.category}`,
      body: `Current waist/hip ratio is ${whrStats.latest.toFixed(2)}. ${whrStats.improved ? 'Decreasing — indicating reduced abdominal fat, which is a positive health signal.' : whrClass.risk === 'concern' ? 'Above 0.95 indicates elevated cardiovascular risk. Focus on waist reduction through diet and exercise.' : 'Within or near healthy range.'}`,
      metrics: ['waistHipRatio', 'waistCm', 'hipCm'],
      period: 'all time',
      confidence: records.length > 5 ? 'high' : 'medium',
    })
  }

  // === Body Water ===
  const bwStats = computeMetricStats(records, 'bodyWater', false)
  if (bwStats && records.some(r => r.bodyWater !== undefined)) {
    const bwClass = classifyBodyWater(bwStats.latest)
    if (bwClass.risk === 'concern') {
      insights.push({
        id: 'body-water-low',
        type: 'concern',
        title: 'Body Water Below Normal',
        body: `Body water at ${bwStats.latest.toFixed(1)}%. Normal range is 45–65%. Low body water can result from dehydration, low muscle mass, or high body fat. Ensure adequate hydration.`,
        metrics: ['bodyWater'],
        period: 'latest reading',
        confidence: 'medium',
      })
    }
  }

  // === Visceral Fat ===
  const vfStats = computeMetricStats(records, 'visceralFat', true)
  if (vfStats && records.some(r => r.visceralFat !== undefined)) {
    const level = vfStats.latest
    let vfRisk: 'positive' | 'neutral' | 'concern' = 'positive'
    let vfMsg = ''
    if (level <= 5) {
      vfMsg = 'Visceral fat is in the healthy range (≤5).'
    } else if (level <= 9) {
      vfMsg = 'Visceral fat is slightly elevated (6–9).'
      vfRisk = 'neutral'
    } else {
      vfMsg = 'Visceral fat is high (≥10), increasing risk for metabolic conditions.'
      vfRisk = 'concern'
    }
    if (vfStats.improved) {
      vfMsg += ` Reduced from ${vfStats.baseline} to ${vfStats.latest} — great progress.`
    } else if (vfStats.absChange > 0) {
      vfMsg += ` Increased from ${vfStats.baseline} to ${vfStats.latest}.`
    }
    insights.push({
      id: 'visceral-fat',
      type: vfStats.improved ? 'positive' : vfRisk,
      title: `Visceral Fat Level: ${level}`,
      body: vfMsg,
      metrics: ['visceralFat'],
      period: 'all time',
      confidence: 'high',
    })
  }

  // === Body recomposition (muscle + fat) ===
  const fatStats90 = computeMetricStats(last90, 'bodyFat', true)
  const musStats90 = computeMetricStats(last90, 'muscleMass', false)
  if (fatStats90 && musStats90 && last90.length > 10) {
    if (fatStats90.improved && musStats90.improved) {
      insights.push({
        id: 'recomp-positive',
        type: 'positive',
        title: 'Body Recomposition Detected',
        body: `Over 90 days: body fat ↓${Math.abs(fatStats90.absChange).toFixed(1)}%, muscle ↑${musStats90.absChange.toFixed(1)} kg. Simultaneous fat loss and muscle gain is a strong recomposition signal.`,
        metrics: ['bodyFat', 'muscleMass'],
        period: '90 days',
        confidence: 'high',
      })
    } else if (fatStats90.improved && Math.abs(musStats90.absChange) < 0.5) {
      insights.push({
        id: 'fat-loss-preserved',
        type: 'positive',
        title: 'Fat Loss, Muscle Preserved',
        body: `Body fat ↓${Math.abs(fatStats90.absChange).toFixed(1)}% over 90 days while muscle mass stayed stable (±0.5 kg). This indicates quality fat loss with minimal muscle catabolism.`,
        metrics: ['bodyFat', 'muscleMass'],
        period: '90 days',
        confidence: 'medium',
      })
    } else if (!fatStats90.improved && musStats90.improved) {
      insights.push({
        id: 'muscle-gain-90',
        type: 'positive',
        title: 'Muscle Mass Increasing',
        body: `Muscle mass gained ${musStats90.absChange.toFixed(1)} kg over 90 days. ${Math.abs(fatStats90.absChange) < 1 ? 'Body fat remained stable — lean gains.' : 'Monitor body fat alongside muscle gain for optimal body composition.'}`,
        metrics: ['muscleMass', 'bodyFat'],
        period: '90 days',
        confidence: 'medium',
      })
    }
  }

  // === Momentum ===
  if (wtStats && wt30) {
    const recentSlope = wt30.slope
    const overallSlope = wtStats.slope
    if (recentSlope < overallSlope * 0.5 && overallSlope < 0 && last30.length > 5) {
      insights.push({
        id: 'momentum-slowing',
        type: 'concern',
        title: 'Weight Progress Slowing',
        body: `Last 30 days trend is slower (${recentSlope.toFixed(3)} kg/reading) than overall (${overallSlope.toFixed(3)}). A plateau may be forming. Consider adjusting calorie intake or increasing activity.`,
        metrics: ['weight'],
        period: '30 days vs all-time',
        confidence: 'medium',
      })
    } else if (recentSlope < overallSlope && overallSlope < 0 && last30.length > 5) {
      insights.push({
        id: 'momentum-strong',
        type: 'positive',
        title: 'Strong Recent Momentum',
        body: `Recent 30-day weight trend is stronger than your overall average — your current approach is working well.`,
        metrics: ['weight'],
        period: '30 days',
        confidence: 'medium',
      })
    }
  }

  // === Consistency ===
  const gapDays: number[] = []
  for (let i = 1; i < records.length; i++) {
    const diff = (records[i].date.getTime() - records[i - 1].date.getTime()) / 86400000
    gapDays.push(diff)
  }
  const avgGap = gapDays.length > 0 ? gapDays.reduce((a, b) => a + b, 0) / gapDays.length : 0
  const maxGap = gapDays.length > 0 ? Math.max(...gapDays) : 0
  if (maxGap > 14) {
    insights.push({
      id: 'gap-warning',
      type: 'concern',
      title: 'Measurement Gaps Detected',
      body: `Longest gap is ${maxGap.toFixed(0)} days (avg: ${avgGap.toFixed(1)}). Inconsistent tracking reduces insight reliability. Aim for at least weekly measurements.`,
      metrics: [],
      period: 'all time',
      confidence: 'high',
    })
  } else {
    insights.push({
      id: 'consistency-good',
      type: 'positive',
      title: 'Consistent Tracking',
      body: `Average gap between measurements: ${avgGap.toFixed(1)} days (max: ${maxGap.toFixed(0)}). Good consistency means more trustworthy insights.`,
      metrics: [],
      period: 'all time',
      confidence: 'high',
    })
  }

  // === Body Age ===
  const baStats = computeMetricStats(records, 'bodyAge', true)
  if (baStats && records.some(r => r.bodyAge !== undefined)) {
    const ageDiff = baStats.latest
    if (baStats.improved && baStats.absChange < 0) {
      insights.push({
        id: 'body-age-improved',
        type: 'positive',
        title: 'Body Age Decreasing',
        body: `Body age dropped from ${baStats.baseline} to ${baStats.latest} years. Body age reflects your metabolic health relative to chronological age — a decrease is an excellent sign.`,
        metrics: ['bodyAge'],
        period: 'all time',
        confidence: 'high',
      })
    } else if (baStats.absChange > 2) {
      insights.push({
        id: 'body-age-up',
        type: 'concern',
        title: 'Body Age Increasing',
        body: `Body age rose from ${baStats.baseline} to ${baStats.latest} years. This can indicate declining metabolic health. Review your nutrition, sleep, and exercise habits.`,
        metrics: ['bodyAge'],
        period: 'all time',
        confidence: 'medium',
      })
    }
  }

  return insights
}

export function generateEvolutionSummary(
  records: BodyRecord[]
): { start: string; now: string; improved: string; recent: string; attention: string } {
  if (records.length < 2) return { start: '', now: '', improved: '', recent: '', attention: '' }

  const first = records[0]
  const last = records[records.length - 1]
  const startDate = first.date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
  const latestDate = last.date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
  const daysCovered = Math.round((last.date.getTime() - first.date.getTime()) / 86400000)

  const startStr = `Tracking began on ${startDate} (${daysCovered} days of data across ${records.length} measurements). ` +
    (first.weight ? `Starting weight: ${first.weight} kg. ` : '') +
    (first.bodyFat ? `Body fat: ${first.bodyFat}%.` : '') +
    (first.bmi ? ` BMI: ${first.bmi}.` : '')

  const nowStr = `Latest measurement on ${latestDate}. ` +
    (last.weight ? `Weight: ${last.weight} kg. ` : '') +
    (last.bodyFat ? `Body fat: ${last.bodyFat}%. ` : '') +
    (last.bmi ? `BMI: ${last.bmi}. ` : '') +
    (last.muscleMass ? `Muscle mass: ${last.muscleMass} kg.` : '')

  const improvedMetrics: string[] = []
  for (const md of METRIC_DEFINITIONS) {
    const stats = computeMetricStats(records, md.key, md.lowerIsBetter)
    if (stats?.improved && Math.abs(stats.absChange) > 0.01) {
      improvedMetrics.push(`${md.label} (${stats.absChange > 0 ? '+' : ''}${stats.absChange.toFixed(md.precision)} ${md.unit})`)
    }
  }
  const improvedStr = improvedMetrics.length
    ? `${improvedMetrics.length} metrics improved: ${improvedMetrics.join(', ')}.`
    : 'No clear improvements detected yet — keep measuring consistently.'

  const last30 = filterByPeriod(records, '30d')
  const recentLines: string[] = []
  for (const md of METRIC_DEFINITIONS.slice(0, 14)) {
    const stats = computeMetricStats(last30, md.key, md.lowerIsBetter)
    if (stats && Math.abs(stats.pctChange) > 0.5) {
      recentLines.push(`${md.label} ${stats.improved ? '▲ improved' : '▼ regressed'} (${stats.absChange > 0 ? '+' : ''}${stats.absChange.toFixed(md.precision)} ${md.unit})`)
    }
  }
  const recentStr = recentLines.length
    ? `In the last 30 days: ${recentLines.join('; ')}.`
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
