import React from 'react'
import type { BodyRecord } from '../../types/metrics'
import { METRIC_DEFINITIONS } from '../../types/metrics'
import { computeMetricStats } from '../../analytics/engine'

interface Props { records: BodyRecord[] }

export function OverviewTab({ records }: Props) {
  const first = records[0]
  const last = records[records.length - 1]
  const daysCovered = Math.round((last.date.getTime() - first.date.getTime()) / 86400000)
  const improvedCount = METRIC_DEFINITIONS.filter(md => {
    const stats = computeMetricStats(records, md.key, md.lowerIsBetter)
    return stats?.improved
  }).length

  return (
    <div>
      {/* Summary bar */}
      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {[
          { label: 'Days tracked', value: daysCovered, unit: 'days' },
          { label: 'Measurements', value: records.length, unit: 'total' },
          { label: 'Metrics improved', value: improvedCount, unit: `/ ${METRIC_DEFINITIONS.length}` },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
            <div className="text-xs" style={{ color: 'var(--color-text-faint || #5a5957)' }}>{s.unit}</div>
          </div>
        ))}
      </div>

      <h2 className="font-semibold mb-4" style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>All Metrics</h2>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {METRIC_DEFINITIONS.map(md => {
          const stats = computeMetricStats(records, md.key, md.lowerIsBetter)
          if (!stats) return null
          const improved = stats.improved
          const arrow = improved ? '▲' : '▼'
          const changeColor = improved ? 'var(--color-success)' : 'var(--color-error)'

          return (
            <div key={md.key} className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>{md.label}</span>
                <span style={{ color: md.color, fontSize: '0.7rem', fontWeight: 700, background: md.color + '18', padding: '2px 6px', borderRadius: '999px' }}>{md.unit || 'no unit'}</span>
              </div>
              <div className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                {stats.latest.toFixed(md.precision)}
              </div>
              <div className="flex items-center gap-2">
                <span style={{ color: changeColor, fontSize: '0.8rem', fontWeight: 600 }}>
                  {arrow} {stats.absChange > 0 ? '+' : ''}{stats.absChange.toFixed(md.precision)}
                </span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                  ({stats.pctChange > 0 ? '+' : ''}{stats.pctChange.toFixed(1)}%)
                </span>
              </div>
              {stats.streak > 1 && (
                <div className="mt-2 text-xs" style={{ color: 'var(--color-primary)' }}>
                  🔥 {stats.streak}-reading streak
                </div>
              )}
              <div className="mt-2 flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <span>from {stats.baseline.toFixed(md.precision)}</span>
                <span>avg {stats.avg.toFixed(md.precision)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
