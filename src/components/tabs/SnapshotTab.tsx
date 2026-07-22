import React, { useMemo } from 'react'
import type { BodyRecord, MetricKey } from '../../types/metrics'
import { METRIC_DEFINITIONS } from '../../types/metrics'
import { computeMetricStats, filterByPeriod } from '../../analytics/engine'
import type { MetricStats } from '../../types/metrics'

interface Props { records: BodyRecord[] }

const SNAPSHOT_METRICS: MetricKey[] = [
  'weight', 'bodyFat', 'muscleMass', 'bmi', 'visceralFat',
  'bodyWater', 'boneMass', 'bmr', 'waistCm', 'bodyAge',
]

type MetricsRow = {
  key: MetricKey
  md: typeof METRIC_DEFINITIONS[number]
  stats: MetricStats
  stats30: MetricStats | null
  has: boolean
}

export function SnapshotTab({ records }: Props) {
  const first = records[0]
  const last = records[records.length - 1]
  const daysCovered = Math.round((last.date.getTime() - first.date.getTime()) / 86400000)
  const last30 = useMemo(() => filterByPeriod(records, '30d'), [records])

  const metricsData = useMemo((): MetricsRow[] => {
    const rows: MetricsRow[] = []
    for (const key of SNAPSHOT_METRICS) {
      const md = METRIC_DEFINITIONS.find(m => m.key === key)
      if (!md) continue
      const stats = computeMetricStats(records, key, md.lowerIsBetter)
      if (!stats) continue
      const stats30 = computeMetricStats(last30, key, md.lowerIsBetter)
      rows.push({ key, md, stats, stats30, has: records.some(r => r[key] !== undefined) })
    }
    return rows
  }, [records, last30])

  const improved = metricsData.filter(m => m.stats.improved && Math.abs(m.stats.absChange) > 0.01)
  const worsened = metricsData.filter(m => !m.stats.improved && m.has && Math.abs(m.stats.absChange) > 0.5)
  const recentChanged = metricsData.filter(m => m.stats30 && Math.abs(m.stats30.pctChange) > 1)

  const startDateStr = first.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const endDateStr = last.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const handleExport = () => {
    const lines = [
      '# Body Evolution Snapshot',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      `Period: ${startDateStr} → ${endDateStr} (${daysCovered} days, ${records.length} measurements)`,
      '',
      '## Metrics Summary',
      ...metricsData.map(m => {
        const s = m.stats!
        const dir = s.improved ? 'IMPROVED' : 'WORSENED'
        return `- ${m.md.label}: ${s.baseline.toFixed(m.md.precision)} → ${s.latest.toFixed(m.md.precision)} (${s.absChange > 0 ? '+' : ''}${s.absChange.toFixed(m.md.precision)} ${m.md.unit}) — ${dir}`
      }),
      '',
      '## Improved',
      ...improved.map(m => `- ${m.md.label}: ${m.stats!.absChange > 0 ? '+' : ''}${m.stats!.absChange.toFixed(m.md.precision)} ${m.md.unit}`),
      '',
      '## Needs Attention',
      ...worsened.map(m => `- ${m.md.label}: ${m.stats!.absChange > 0 ? '+' : ''}${m.stats!.absChange.toFixed(m.md.precision)} ${m.md.unit}`),
      '',
      '## Recent Changes (30 days)',
      ...recentChanged.map(m => `- ${m.md.label}: ${m.stats30!.absChange > 0 ? '+' : ''}${m.stats30!.absChange.toFixed(m.md.precision)} ${m.md.unit} (${m.stats30!.pctChange.toFixed(1)}%)`),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `body-snapshot-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold mb-0.5" style={{ color: 'var(--color-text)' }}>Evolution Snapshot</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            {daysCovered} days · {records.length} measurements
          </p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'rgba(79,152,163,0.12)', color: 'var(--color-primary)', border: '1px solid rgba(79,152,163,0.3)' }}
        >Export .txt</button>
      </div>

      {/* Date range banner */}
      <div className="card p-4 mb-5 flex items-center justify-center gap-4 flex-wrap">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Started</div>
          <span className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text)' }}>
            {startDateStr}
          </span>
        </div>
        <div className="flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
          <div className="h-px w-8" style={{ background: 'var(--color-border)' }} />
          <span className="text-xs">{daysCovered}d</span>
          <div className="h-px w-8" style={{ background: 'var(--color-border)' }} />
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Latest</div>
          <span className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{ background: 'rgba(79,152,163,0.15)', color: 'var(--color-primary)' }}>
            {endDateStr}
          </span>
        </div>
      </div>

      {/* Key metrics comparison */}
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
        style={{ color: 'var(--color-text-muted)' }}>
        <span style={{ display: 'inline-block', width: 3, height: 14, borderRadius: 2, background: 'var(--color-primary)' }} />
        Key Metrics
      </h3>

      <div className="card overflow-hidden mb-5">
        <div className="grid text-[10px] uppercase tracking-wider font-semibold px-4 py-2.5"
          style={{ gridTemplateColumns: '1fr 120px 80px 60px', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.015)' }}>
          <span>Metric</span>
          <span className="text-right">Start → Now</span>
          <span className="text-right">Change</span>
          <span className="text-right">%</span>
        </div>
        {metricsData.map(m => {
          const s = m.stats!
          const improved = s.improved
          const arrow = improved ? '▴' : '▾'
          const changeColor = improved ? 'var(--color-success)' : 'var(--color-error)'
          const pct = s.baseline !== 0 ? Math.abs((s.absChange / s.baseline) * 100) : 0
          const isSignificant = Math.abs(s.absChange) > 0.01

          return (
            <div key={m.key}
              className="grid px-4 py-2.5 items-center transition-colors hover:bg-white/[0.02]"
              style={{
                gridTemplateColumns: '1fr 120px 80px 60px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
              }}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.md.color }} />
                <span className="text-sm truncate" style={{ color: 'var(--color-text)' }}>{m.md.label}</span>
              </div>
              <span className="text-xs font-mono text-right" style={{ color: 'var(--color-text-muted)' }}>
                {s.baseline.toFixed(m.md.precision)} → {s.latest.toFixed(m.md.precision)}
              </span>
              <span className={`text-xs font-semibold text-right flex items-center justify-end gap-0.5 ${!isSignificant ? 'opacity-40' : ''}`}
                style={{ color: isSignificant ? changeColor : 'var(--color-text-muted)' }}>
                {isSignificant ? <>{arrow} {Math.abs(s.absChange).toFixed(m.md.precision)}</> : '—'}
              </span>
              <span className="text-[10px] text-right"
                style={{ color: isSignificant ? changeColor : 'var(--color-text-muted)', opacity: isSignificant ? 0.8 : 0.4 }}>
                {isSignificant ? `${pct.toFixed(1)}%` : '—'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Improved section */}
      {improved.length > 0 && (
        <div className="mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
            style={{ color: 'var(--color-success)' }}>
            <span style={{ display: 'inline-block', width: 3, height: 14, borderRadius: 2, background: 'var(--color-success)' }} />
            Improved ({improved.length})
          </h3>
          <div className="card p-1 flex flex-col gap-0.5">
            {improved.map(m => (
              <div key={m.key} className="flex items-center justify-between py-2 px-3 rounded-lg"
                style={{ background: 'rgba(109,170,69,0.04)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--color-success)' }} />
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>{m.md.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                    {m.stats!.baseline.toFixed(m.md.precision)} → {m.stats!.latest.toFixed(m.md.precision)}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-success)' }}>
                    ▴ {Math.abs(m.stats!.absChange).toFixed(m.md.precision)} {m.md.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Worsened section */}
      {worsened.length > 0 && (
        <div className="mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
            style={{ color: 'var(--color-error)' }}>
            <span style={{ display: 'inline-block', width: 3, height: 14, borderRadius: 2, background: 'var(--color-error)' }} />
            Needs Attention ({worsened.length})
          </h3>
          <div className="card p-1 flex flex-col gap-0.5">
            {worsened.map(m => (
              <div key={m.key} className="flex items-center justify-between py-2 px-3 rounded-lg"
                style={{ background: 'rgba(209,99,167,0.04)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--color-error)' }} />
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>{m.md.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                    {m.stats!.baseline.toFixed(m.md.precision)} → {m.stats!.latest.toFixed(m.md.precision)}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-error)' }}>
                    ▾ {Math.abs(m.stats!.absChange).toFixed(m.md.precision)} {m.md.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent changes (30 days) */}
      {recentChanged.length > 0 && (
        <div className="mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
            style={{ color: 'var(--color-primary)' }}>
            <span style={{ display: 'inline-block', width: 3, height: 14, borderRadius: 2, background: 'var(--color-primary)' }} />
            Recent Changes · Last 30 Days
          </h3>
          <div className="card p-1 flex flex-col gap-0.5">
            {recentChanged.map(m => {
              const s = m.stats30!
              const improved = s.improved
              const changeColor = improved ? 'var(--color-success)' : 'var(--color-error)'
              const arrow = improved ? '▴' : '▾'
              return (
                <div key={m.key} className="flex items-center justify-between py-2 px-3 rounded-lg"
                  style={{ background: 'rgba(79,152,163,0.04)' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: changeColor }} />
                    <span className="text-sm" style={{ color: 'var(--color-text)' }}>{m.md.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: changeColor, fontWeight: 600 }}>
                      {arrow} {s.absChange > 0 ? '+' : ''}{s.absChange.toFixed(m.md.precision)} {m.md.unit}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      ({s.pctChange > 0 ? '+' : ''}{s.pctChange.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-6 p-3 rounded-lg text-xs"
        style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
        This analysis is data-driven and informational only. It is not medical advice. Consult a healthcare professional for clinical guidance.
      </div>
    </div>
  )
}
