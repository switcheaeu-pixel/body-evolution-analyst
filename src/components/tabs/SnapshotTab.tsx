import React, { useMemo, useState, useCallback } from 'react'
import type { BodyRecord, MetricKey } from '../../types/metrics'
import { METRIC_DEFINITIONS } from '../../types/metrics'
import { computeMetricStats } from '../../analytics/engine'
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

const PRESETS = [
  { label: '7d',  days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '6M',  days: 182 },
  { label: '1Y',  days: 365 },
  { label: 'All', days: 0 },
]

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function SnapshotTab({ records }: Props) {
  const allFirst = records[0]
  const allLast  = records[records.length - 1]

  const [fromIdx, setFromIdx] = useState(0)
  const [toIdx,   setToIdx]   = useState(records.length - 1)
  const [activePreset, setActivePreset] = useState<number>(5) // 5 = All

  const applyPreset = useCallback((days: number) => {
    if (days === 0) {
      setFromIdx(0)
      setToIdx(records.length - 1)
    } else {
      const cutoff = new Date(allLast.date.getTime() - days * 86400000)
      const idx = records.findIndex(r => r.date >= cutoff)
      setFromIdx(idx === -1 ? 0 : idx)
      setToIdx(records.length - 1)
    }
  }, [records, allLast])

  const handlePreset = (days: number, pIdx: number) => {
    setActivePreset(pIdx)
    applyPreset(days)
  }

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    const idx = records.findIndex(r => toDateInput(r.date) >= val)
    if (idx !== -1 && idx < toIdx) { setFromIdx(idx); setActivePreset(-1) }
  }

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    let idx = -1
    for (let i = records.length - 1; i >= 0; i--) {
      if (toDateInput(records[i].date) <= val) { idx = i; break }
    }
    if (idx !== -1 && idx > fromIdx) { setToIdx(idx); setActivePreset(-1) }
  }

  const handleFromSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    if (v < toIdx) { setFromIdx(v); setActivePreset(-1) }
  }

  const handleToSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    if (v > fromIdx) { setToIdx(v); setActivePreset(-1) }
  }

  const rangedRecords = useMemo(() => records.slice(fromIdx, toIdx + 1), [records, fromIdx, toIdx])

  const first = rangedRecords[0]
  const last  = rangedRecords[rangedRecords.length - 1]
  const daysCovered = Math.round((last.date.getTime() - first.date.getTime()) / 86400000)

  const last30 = useMemo(() => {
    const cutoff = new Date(last.date.getTime() - 30 * 86400000)
    return rangedRecords.filter(r => r.date >= cutoff)
  }, [rangedRecords, last])

  const metricsData = useMemo((): MetricsRow[] => {
    const rows: MetricsRow[] = []
    for (const key of SNAPSHOT_METRICS) {
      const md = METRIC_DEFINITIONS.find(m => m.key === key)
      if (!md) continue
      const stats = computeMetricStats(rangedRecords, key, md.lowerIsBetter)
      if (!stats) continue
      const stats30 = computeMetricStats(last30, key, md.lowerIsBetter)
      rows.push({ key, md, stats, stats30, has: rangedRecords.some(r => r[key] !== undefined) })
    }
    return rows
  }, [rangedRecords, last30])

  const improved      = metricsData.filter(m => m.stats.improved && Math.abs(m.stats.absChange) > 0.01)
  const worsened      = metricsData.filter(m => !m.stats.improved && m.has && Math.abs(m.stats.absChange) > 0.5)
  const recentChanged = metricsData.filter(m => m.stats30 && Math.abs(m.stats30.pctChange) > 1)

  const startDateStr = first.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const endDateStr   = last.date.toLocaleDateString('en-GB',  { day: 'numeric', month: 'short', year: 'numeric' })

  const sliderPct = (idx: number) =>
    records.length > 1 ? (idx / (records.length - 1)) * 100 : 0

  const handleExport = () => {
    const lines = [
      '# Body Evolution Snapshot',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      `Period: ${startDateStr} -> ${endDateStr} (${daysCovered} days, ${rangedRecords.length} measurements)`,
      '',
      '## Metrics Summary',
      ...metricsData.map(m => {
        const s = m.stats
        return `- ${m.md.label}: ${s.baseline.toFixed(m.md.precision)} -> ${s.latest.toFixed(m.md.precision)} (${s.absChange > 0 ? '+' : ''}${s.absChange.toFixed(m.md.precision)} ${m.md.unit}) -- ${s.improved ? 'IMPROVED' : 'WORSENED'}`
      }),
      '',
      '## Improved',
      ...improved.map(m => `- ${m.md.label}: ${m.stats.absChange > 0 ? '+' : ''}${m.stats.absChange.toFixed(m.md.precision)} ${m.md.unit}`),
      '',
      '## Needs Attention',
      ...worsened.map(m => `- ${m.md.label}: ${m.stats.absChange > 0 ? '+' : ''}${m.stats.absChange.toFixed(m.md.precision)} ${m.md.unit}`),
      '',
      '## Recent Changes (last 30 days of range)',
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
      {/* Slider thumb styles */}
      <style>{`
        .snap-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: var(--color-primary);
          border: 2.5px solid #1c1b19;
          box-shadow: 0 1px 6px rgba(0,0,0,0.5);
          cursor: pointer;
        }
        .snap-range::-moz-range-thumb {
          width: 16px; height: 16px;
          border-radius: 50%;
          background: var(--color-primary);
          border: 2.5px solid #1c1b19;
          cursor: pointer;
        }
        .snap-range { pointer-events: none; }
        .snap-range::-webkit-slider-thumb { pointer-events: auto; }
        .snap-range::-moz-range-thumb     { pointer-events: auto; }
        .snap-range:focus { outline: none; }
      `}</style>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold mb-0.5" style={{ color: 'var(--color-text)' }}>Evolution Snapshot</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            {daysCovered} days &middot; {rangedRecords.length} measurements
          </p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'rgba(79,152,163,0.12)', color: 'var(--color-primary)', border: '1px solid rgba(79,152,163,0.3)' }}
        >Export .txt</button>
      </div>

      {/* ── Time-range control ──────────────────────────────────── */}
      <div className="card p-4 mb-5">

        {/* Quick-select presets */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider font-semibold mr-1" style={{ color: 'var(--color-text-muted)' }}>Range</span>
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => handlePreset(p.days, i)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: activePreset === i ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)',
                color:      activePreset === i ? '#fff' : 'var(--color-text-muted)',
              }}
            >{p.label}</button>
          ))}
        </div>

        {/* Dual-thumb range slider */}
        <div className="relative mb-4" style={{ height: 24 }}>
          {/* Track background */}
          <div className="absolute rounded-full" style={{
            height: 4, top: '50%', transform: 'translateY(-50%)',
            left: 0, right: 0,
            background: 'rgba(255,255,255,0.08)',
          }} />
          {/* Active fill */}
          <div className="absolute rounded-full" style={{
            height: 4, top: '50%', transform: 'translateY(-50%)',
            left:  `${sliderPct(fromIdx)}%`,
            width: `${sliderPct(toIdx) - sliderPct(fromIdx)}%`,
            background: 'var(--color-primary)',
            transition: 'left 0.05s, width 0.05s',
          }} />
          {/* From slider */}
          <input
            type="range" min={0} max={records.length - 1} value={fromIdx}
            onChange={handleFromSlider}
            className="snap-range absolute w-full appearance-none bg-transparent"
            style={{ top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}
          />
          {/* To slider */}
          <input
            type="range" min={0} max={records.length - 1} value={toIdx}
            onChange={handleToSlider}
            className="snap-range absolute w-full appearance-none bg-transparent"
            style={{ top: '50%', transform: 'translateY(-50%)', zIndex: 3 }}
          />
        </div>

        {/* Date pickers */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>From</span>
            <input
              type="date"
              value={toDateInput(first.date)}
              min={toDateInput(allFirst.date)}
              max={toDateInput(last.date)}
              onChange={handleFromChange}
              className="text-xs rounded px-2 py-1"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-text)', colorScheme: 'dark' }}
            />
          </div>
          <div className="h-px flex-1" style={{ background: 'var(--color-border)', minWidth: 12 }} />
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>To</span>
            <input
              type="date"
              value={toDateInput(last.date)}
              min={toDateInput(first.date)}
              max={toDateInput(allLast.date)}
              onChange={handleToChange}
              className="text-xs rounded px-2 py-1"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-text)', colorScheme: 'dark' }}
            />
          </div>
          <span className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>
            {rangedRecords.length} records
          </span>
        </div>
      </div>

      {/* Date range banner */}
      <div className="card p-4 mb-5 flex items-center justify-center gap-4 flex-wrap">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Started</div>
          <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text)' }}>
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
          <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(79,152,163,0.15)', color: 'var(--color-primary)' }}>
            {endDateStr}
          </span>
        </div>
      </div>

      {/* Key metrics */}
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
        <span style={{ display: 'inline-block', width: 3, height: 14, borderRadius: 2, background: 'var(--color-primary)' }} />
        Key Metrics
      </h3>
      <div className="card overflow-hidden mb-5">
        <div className="grid text-[10px] uppercase tracking-wider font-semibold px-4 py-2.5"
          style={{ gridTemplateColumns: '1fr 120px 80px 60px', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.015)' }}>
          <span>Metric</span><span className="text-right">Start &rarr; Now</span><span className="text-right">Change</span><span className="text-right">%</span>
        </div>
        {metricsData.map(m => {
          const s = m.stats
          const imp = s.improved
          const changeColor = imp ? 'var(--color-success)' : 'var(--color-error)'
          const pct = s.baseline !== 0 ? Math.abs((s.absChange / s.baseline) * 100) : 0
          const sig = Math.abs(s.absChange) > 0.01
          return (
            <div key={m.key} className="grid px-4 py-2.5 items-center hover:bg-white/[0.02]"
              style={{ gridTemplateColumns: '1fr 120px 80px 60px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.md.color }} />
                <span className="text-sm truncate" style={{ color: 'var(--color-text)' }}>{m.md.label}</span>
              </div>
              <span className="text-xs font-mono text-right" style={{ color: 'var(--color-text-muted)' }}>
                {s.baseline.toFixed(m.md.precision)} &rarr; {s.latest.toFixed(m.md.precision)}
              </span>
              <span className={`text-xs font-semibold text-right flex items-center justify-end gap-0.5 ${!sig ? 'opacity-40' : ''}`}
                style={{ color: sig ? changeColor : 'var(--color-text-muted)' }}>
                {sig ? <>{imp ? '\u25b4' : '\u25be'} {Math.abs(s.absChange).toFixed(m.md.precision)}</> : '\u2014'}
              </span>
              <span className="text-[10px] text-right" style={{ color: sig ? changeColor : 'var(--color-text-muted)', opacity: sig ? 0.8 : 0.4 }}>
                {sig ? `${pct.toFixed(1)}%` : '\u2014'}
              </span>
            </div>
          )
        })}
      </div>

      {improved.length > 0 && (
        <div className="mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--color-success)' }}>
            <span style={{ display: 'inline-block', width: 3, height: 14, borderRadius: 2, background: 'var(--color-success)' }} />
            Improved ({improved.length})
          </h3>
          <div className="card p-1 flex flex-col gap-0.5">
            {improved.map(m => (
              <div key={m.key} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'rgba(109,170,69,0.04)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-success)' }} />
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>{m.md.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                    {m.stats.baseline.toFixed(m.md.precision)} &rarr; {m.stats.latest.toFixed(m.md.precision)}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-success)' }}>
                    &#9652; {Math.abs(m.stats.absChange).toFixed(m.md.precision)} {m.md.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {worsened.length > 0 && (
        <div className="mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--color-error)' }}>
            <span style={{ display: 'inline-block', width: 3, height: 14, borderRadius: 2, background: 'var(--color-error)' }} />
            Needs Attention ({worsened.length})
          </h3>
          <div className="card p-1 flex flex-col gap-0.5">
            {worsened.map(m => (
              <div key={m.key} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'rgba(209,99,167,0.04)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-error)' }} />
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>{m.md.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                    {m.stats.baseline.toFixed(m.md.precision)} &rarr; {m.stats.latest.toFixed(m.md.precision)}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-error)' }}>
                    &#9662; {Math.abs(m.stats.absChange).toFixed(m.md.precision)} {m.md.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentChanged.length > 0 && (
        <div className="mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <span style={{ display: 'inline-block', width: 3, height: 14, borderRadius: 2, background: 'var(--color-primary)' }} />
            Recent Changes &middot; Last 30 Days of Range
          </h3>
          <div className="card p-1 flex flex-col gap-0.5">
            {recentChanged.map(m => {
              const s = m.stats30!
              const imp = s.improved
              const changeColor = imp ? 'var(--color-success)' : 'var(--color-error)'
              return (
                <div key={m.key} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'rgba(79,152,163,0.04)' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: changeColor }} />
                    <span className="text-sm" style={{ color: 'var(--color-text)' }}>{m.md.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold" style={{ color: changeColor }}>
                      {imp ? '\u25b4' : '\u25be'} {s.absChange > 0 ? '+' : ''}{s.absChange.toFixed(m.md.precision)} {m.md.unit}
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

      <div className="mt-6 p-3 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
        This analysis is data-driven and informational only. It is not medical advice. Consult a healthcare professional for clinical guidance.
      </div>
    </div>
  )
}
