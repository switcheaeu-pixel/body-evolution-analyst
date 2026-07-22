import React, { useMemo } from 'react'
import type { BodyRecord } from '../../types/metrics'
import { METRIC_DEFINITIONS } from '../../types/metrics'
import type { MetricKey } from '../../types/metrics'

interface Props { records: BodyRecord[] }

const CHECKIN_METRICS: MetricKey[] = ['weight', 'bodyFat', 'muscleMass', 'bmi', 'visceralFat', 'waistCm', 'bodyWater']

function changeColor(current: number, previous: number, lowerIsBetter: boolean): string {
  if (current === previous) return 'var(--color-text-muted)'
  const improved = lowerIsBetter ? current < previous : current > previous
  return improved ? 'var(--color-success)' : 'var(--color-error)'
}

function changeArrow(current: number, previous: number, lowerIsBetter: boolean): string {
  if (Math.abs(current - previous) < 0.001) return '→'
  const improved = lowerIsBetter ? current < previous : current > previous
  return improved ? '▴' : '▾'
}

export function ProgressTab({ records }: Props) {
  const reversedRecords = useMemo(() => [...records].reverse(), [records])

  const latest = records[records.length - 1]
  const prevCheckin = records.length > 1 ? records[records.length - 2] : null
  const weekAgo = useMemo(() => {
    if (!latest) return null
    const weekAgoMs = 7 * 24 * 60 * 60 * 1000
    const target = latest.date.getTime() - weekAgoMs
    let closest = records[0]
    for (const r of records) {
      if (Math.abs(r.date.getTime() - target) < Math.abs(closest.date.getTime() - target)) {
        closest = r
      }
    }
    return closest !== latest ? closest : null
  }, [records, latest])

  return (
    <div>
      {/* Latest Check-in Highlight */}
      <div className="mb-6">
        <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Progress Log</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Chronological check-in history with change detection between entries.
        </p>
      </div>

      {prevCheckin && (
        <div className="card p-5 mb-6" style={{ borderColor: 'var(--color-primary)', borderWidth: '1px' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />
              <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>Latest Check-in</h2>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: 'var(--color-primary)', color: '#fff' }}>
              {latest.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
            {CHECKIN_METRICS.map(key => {
              const md = METRIC_DEFINITIONS.find(m => m.key === key)
              if (!md || latest[key] === undefined) return null
              const curr = latest[key] as number
              const prev = prevCheckin[key] as number | undefined
              return (
                <div key={key} className="flex items-center justify-between p-2 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div>
                    <span className="text-[10px] block uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{md.label}</span>
                    <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                      {curr.toFixed(md.precision)} <span className="text-[10px] font-normal" style={{ color: 'var(--color-text-muted)' }}>{md.unit}</span>
                    </span>
                  </div>
                  {prev !== undefined && (
                    <span className="text-xs font-semibold flex items-center gap-0.5" style={{ color: changeColor(curr, prev, md.lowerIsBetter) }}>
                      {changeArrow(curr, prev, md.lowerIsBetter)} {Math.abs(curr - prev).toFixed(md.precision)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Week-over-week summary */}
          {weekAgo && (
            <div className="mt-3 pt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ borderTop: '1px solid var(--color-border)' }}>
              <span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>vs 7 days ago:</span>
              {CHECKIN_METRICS.map(key => {
                const md = METRIC_DEFINITIONS.find(m => m.key === key)
                if (!md || latest[key] === undefined || weekAgo[key] === undefined) return null
                const curr = latest[key] as number
                const prev = weekAgo[key] as number
                const diff = curr - prev
                if (Math.abs(diff) < 0.001) return null
                return (
                  <span key={key} style={{ color: changeColor(curr, prev, md.lowerIsBetter) }}>
                    {changeArrow(curr, prev, md.lowerIsBetter)} {diff > 0 ? '+' : ''}{diff.toFixed(md.precision)} {md.label}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Chronological Log */}
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
        Full Check-in History ({records.length})
      </h3>

      <div className="overflow-auto rounded-lg" style={{ maxHeight: 'calc(100vh - 420px)' }}>
        <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, background: 'var(--color-surface)', zIndex: 1 }}>
              <th className="px-3 py-2 text-left font-medium whitespace-nowrap" style={{ color: 'var(--color-text-muted)', borderBottom: '2px solid var(--color-border)' }}>Date</th>
              {CHECKIN_METRICS.map(key => {
                const md = METRIC_DEFINITIONS.find(m => m.key === key)
                if (!md || !records.some(r => r[key] !== undefined)) return null
                return (
                  <th key={key} className="px-3 py-2 text-right font-medium whitespace-nowrap" style={{ color: md.color, borderBottom: '2px solid var(--color-border)' }}>
                    {md.label}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {reversedRecords.map((r, i) => {
              const prev = i < reversedRecords.length - 1 ? reversedRecords[i + 1] : null
              const dateStr = r.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              const isFirst = i === 0
              const isWeekend = r.date.getDay() === 0 || r.date.getDay() === 6

              return (
                <tr
                  key={i}
                  className="transition-colors"
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: isFirst ? 'rgba(79,152,163,0.06)' : isWeekend ? 'rgba(255,255,255,0.015)' : 'transparent',
                  }}
                >
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: isFirst ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                    {isFirst && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: 'var(--color-primary)' }} />}
                    {dateStr}
                  </td>
                  {CHECKIN_METRICS.filter(key => records.some(r => r[key] !== undefined)).map(key => {
                    const md = METRIC_DEFINITIONS.find(m => m.key === key)!
                    const val = r[key] as number | undefined
                    const prevVal = prev?.[key] as number | undefined
                    return (
                      <td key={key} className="px-3 py-2 text-right font-mono whitespace-nowrap" style={{ color: val !== undefined ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                        {val !== undefined ? (
                          <span className="flex items-center justify-end gap-1">
                            {val.toFixed(md.precision)}
                            {prevVal !== undefined && i < reversedRecords.length - 1 && Math.abs(val - prevVal) > 0.001 && (
                              <span style={{ color: changeColor(val, prevVal, md.lowerIsBetter), fontSize: '0.65rem' }}>
                                {changeArrow(val, prevVal, md.lowerIsBetter)}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
