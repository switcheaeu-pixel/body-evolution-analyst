import React from 'react'
import type { BodyRecord, MetricKey, MetricDefinition } from '../../types/metrics'
import { METRIC_DEFINITIONS } from '../../types/metrics'
import { computeMetricStats, getValues, filterByPeriod } from '../../analytics/engine'

interface Props { records: BodyRecord[] }

function Sparkline({ values, width, height, color, positive }: { values: number[]; width: number; height: number; color: string; positive: boolean | null }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  })
  const strokeCls = positive === null ? 'sparkline-neutral' : positive ? 'sparkline-positive' : 'sparkline-negative'
  return (
    <svg width={width} height={height} className="flex-shrink-0" aria-hidden>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={strokeCls}
        style={{ opacity: 0.8 }}
      />
    </svg>
  )
}

function ProgressBar({ min, max, current, color, improved }: { min: number; max: number; current: number; color: string; improved: boolean | null }) {
  const range = max - min || 1
  const pct = ((current - min) / range) * 100
  const clamped = Math.max(2, Math.min(98, pct))
  const barColor = improved === null ? 'var(--color-primary)' : improved ? 'var(--color-success)' : 'var(--color-error)'

  return (
    <div className="w-full h-1 rounded-full mt-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${clamped}%`, background: barColor, opacity: 0.7 }}
      />
    </div>
  )
}

function MetricCard({ md, stats }: { md: MetricDefinition; stats: ReturnType<typeof computeMetricStats> }) {
  if (!stats) return null

  const improved = stats.improved
  const arrow = improved ? '▴' : '▾'
  const changeColor = improved ? 'var(--color-success)' : 'var(--color-error)'
  const changeBg = improved ? 'rgba(109,170,69,0.1)' : 'rgba(209,99,167,0.1)'

  return (
    <div className="card p-4 hover:border-white/12 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{md.label}</span>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: md.color, background: md.color + '18' }}>
          {md.unit || '-'}
        </span>
      </div>

      {/* Value + Change */}
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          {stats.latest.toFixed(md.precision)}
        </span>
        <span className="text-xs font-semibold px-1.5 py-0.5 rounded flex items-center gap-1" style={{ color: changeColor, background: changeBg }}>
          {arrow} {stats.absChange > 0 ? '+' : ''}{stats.absChange.toFixed(md.precision)}
        </span>
      </div>

      {/* Progress bar */}
      <ProgressBar min={stats.min} max={stats.max} current={stats.latest} color={md.color} improved={improved} />

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
        <span>from {stats.baseline.toFixed(md.precision)}</span>
        <span>avg {stats.avg.toFixed(md.precision)}</span>
      </div>

      {/* Streak */}
      {stats.streak > 2 && (
        <div className="mt-2 flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-primary)' }}>
          <span>🔥</span>
          <span>{stats.streak} reading streak</span>
        </div>
      )}
    </div>
  )
}

function KeyMetricCard({ md, stats, records }: { md: MetricDefinition; stats: ReturnType<typeof computeMetricStats>; records: BodyRecord[] }) {
  if (!stats) return null

  const improved = stats.improved
  const arrow = improved ? '▴' : '▾'
  const changeColor = improved ? 'var(--color-success)' : 'var(--color-error)'
  const changeBg = improved ? 'rgba(109,170,69,0.12)' : 'rgba(209,99,167,0.12)'

  const last90 = filterByPeriod(records, '90d')
  const vals30 = getValues(last90, md.key).map(p => p.value)

  const pctChange = stats.pctChange

  return (
    <div className="card p-5 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-0 w-1 h-full" style={{ background: md.color, opacity: 0.5 }} />

      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{md.label}</span>
          <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: md.color, background: md.color + '14' }}>
            {md.unit || '-'}
          </span>
        </div>
        {stats.streak > 2 && (
          <span className="text-[11px] font-medium flex items-center gap-0.5" style={{ color: 'var(--color-primary)' }}>
            🔥 {stats.streak}
          </span>
        )}
      </div>

      <div className="flex items-end gap-4">
        <div className="flex-1">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              {stats.latest.toFixed(md.precision)}
            </span>
            <span className="text-sm font-semibold px-2 py-0.5 rounded flex items-center gap-1" style={{ color: changeColor, background: changeBg }}>
              {arrow} {Math.abs(stats.absChange).toFixed(md.precision)} {md.unit}
            </span>
          </div>
          <div className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}% overall · started at {stats.baseline.toFixed(md.precision)}
          </div>
        </div>

        {vals30.length > 2 && (
          <Sparkline values={vals30} width={100} height={36} color={md.color} positive={improved} />
        )}
      </div>

      <ProgressBar min={stats.min} max={stats.max} current={stats.latest} color={md.color} improved={improved} />
    </div>
  )
}

function GroupHeader({ label }: { label: string }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider mt-6 mb-3" style={{ color: 'var(--color-text-muted)' }}>
      {label}
    </h3>
  )
}

export function OverviewTab({ records }: Props) {
  const first = records[0]
  const last = records[records.length - 1]
  const daysCovered = Math.round((last.date.getTime() - first.date.getTime()) / 86400000)

  const improvedCount = METRIC_DEFINITIONS.reduce((count, md) => {
    const stats = computeMetricStats(records, md.key, md.lowerIsBetter)
    return count + (stats?.improved ? 1 : 0)
  }, 0)

  const improvingPct = METRIC_DEFINITIONS.length > 0 ? Math.round((improvedCount / METRIC_DEFINITIONS.length) * 100) : 0

  const keyMetrics: MetricKey[] = ['weight', 'bodyFat', 'muscleMass', 'bmi']
  const compositionMetrics = METRIC_DEFINITIONS.filter(md => md.group === 'composition' && !keyMetrics.includes(md.key) && records.some(r => r[md.key] !== undefined))
  const vitalsMetrics = METRIC_DEFINITIONS.filter(md => md.group === 'vitals' && records.some(r => r[md.key] !== undefined))
  const measurementMetrics = METRIC_DEFINITIONS.filter(md => md.group === 'measurements' && records.some(r => r[md.key] !== undefined))

  return (
    <div>
      {/* Summary bar */}
      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{daysCovered}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Days tracked</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{records.length}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Measurements</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: improvingPct >= 50 ? 'var(--color-success)' : 'var(--color-warning)' }}>{improvingPct}%</div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Metrics improving</div>
          <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{improvedCount}/{METRIC_DEFINITIONS.length}</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
            {(() => {
              const dates = records.map(r => r.date.getTime())
              const nextDate = dates[dates.length - 1]
              const daysSinceLast = last ? Math.round((new Date().getTime() - last.date.getTime()) / 86400000) : 0
              return daysSinceLast <= 1 ? 'Today' : `${daysSinceLast}d ago`
            })()}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Last check-in</div>
          <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {last.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
        Key Metrics
      </h3>
      <div className="grid gap-4 mb-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {keyMetrics.map(key => {
          const md = METRIC_DEFINITIONS.find(m => m.key === key)
          if (!md || !records.some(r => r[key] !== undefined)) return null
          const stats = computeMetricStats(records, key, md.lowerIsBetter)
          return <KeyMetricCard key={key} md={md} stats={stats} records={records} />
        })}
      </div>

      {/* Composition */}
      {compositionMetrics.length > 0 && (
        <>
          <GroupHeader label="Body Composition" />
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            {compositionMetrics.map(md => {
              const stats = computeMetricStats(records, md.key, md.lowerIsBetter)
              return <MetricCard key={md.key} md={md} stats={stats} />
            })}
          </div>
        </>
      )}

      {/* Vitals */}
      {vitalsMetrics.length > 0 && (
        <>
          <GroupHeader label="Vitals" />
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            {vitalsMetrics.map(md => {
              const stats = computeMetricStats(records, md.key, md.lowerIsBetter)
              return <MetricCard key={md.key} md={md} stats={stats} />
            })}
          </div>
        </>
      )}

      {/* Measurements */}
      {measurementMetrics.length > 0 && (
        <>
          <GroupHeader label="Measurements" />
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            {measurementMetrics.map(md => {
              const stats = computeMetricStats(records, md.key, md.lowerIsBetter)
              return <MetricCard key={md.key} md={md} stats={stats} />
            })}
          </div>
        </>
      )}
    </div>
  )
}
