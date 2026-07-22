import React, { useState, useMemo } from 'react'
import type { BodyRecord, MetricKey } from '../../types/metrics'
import { METRIC_DEFINITIONS } from '../../types/metrics'
import { filterByPeriod, getValues, rollingAverage, computeMetricStats } from '../../analytics/engine'
import type { PeriodKey } from '../../analytics/engine'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid, Legend
} from 'recharts'

interface Props { records: BodyRecord[] }

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '7d',  label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: '6m',  label: '6M' },
  { key: '1y',  label: '1Y' },
  { key: 'all', label: 'All' },
]

export function TrendsTab({ records }: Props) {
  const [period, setPeriod] = useState<PeriodKey>('all')
  const [primaryMetric, setPrimaryMetric] = useState<MetricKey>('weight')
  const [compareMetric, setCompareMetric] = useState<MetricKey | null>(null)
  const [showMA, setShowMA] = useState(true)

  const filtered = useMemo(() => filterByPeriod(records, period), [records, period])
  const primaryDef = METRIC_DEFINITIONS.find(m => m.key === primaryMetric)!

  const primaryPts = useMemo(() => getValues(filtered, primaryMetric), [filtered, primaryMetric])
  const primaryVals = primaryPts.map(p => p.value)
  const primaryMA = useMemo(() => rollingAverage(primaryVals, 7), [primaryVals])

  const comparePts = useMemo(() => compareMetric ? getValues(filtered, compareMetric) : [], [filtered, compareMetric])
  const compareVals = comparePts.map(p => p.value)
  const compareMA = useMemo(() => compareMetric ? rollingAverage(compareVals, 7) : [], [compareVals, compareMetric])
  const compareDef = compareMetric ? METRIC_DEFINITIONS.find(m => m.key === compareMetric)! : null

  const primaryStats = useMemo(() => computeMetricStats(filtered, primaryMetric, primaryDef.lowerIsBetter), [filtered, primaryMetric, primaryDef.lowerIsBetter])

  const primaryMin = primaryVals.length ? Math.min(...primaryVals) : 0
  const primaryBaseline = primaryVals.length ? primaryVals[0] : 0

  const chartData = useMemo(() => {
    const dateMap = new Map<number, { dateStr: string; dateFull: string; value: number | null; ma: number | null; value2: number | null; ma2: number | null }>()

    for (let i = 0; i < primaryPts.length; i++) {
      const p = primaryPts[i]
      const ts = p.date.getTime()
      dateMap.set(ts, {
        dateStr: p.date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
        dateFull: p.date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }),
        value: +p.value.toFixed(2),
        ma: +primaryMA[i].toFixed(2),
        value2: null,
        ma2: null,
      })
    }

    if (compareMetric) {
      for (let i = 0; i < comparePts.length; i++) {
        const p = comparePts[i]
        const ts = p.date.getTime()
        const entry = dateMap.get(ts)
        if (entry) {
          entry.value2 = +p.value.toFixed(2)
          entry.ma2 = compareMA[i] ? +compareMA[i].toFixed(2) : null
        } else {
          dateMap.set(ts, {
            dateStr: p.date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
            dateFull: p.date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }),
            value: null,
            ma: null,
            value2: +p.value.toFixed(2),
            ma2: compareMA[i] ? +compareMA[i].toFixed(2) : null,
          })
        }
      }
    }

    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([_, d]) => ({
        date: d.dateStr,
        dateFull: d.dateFull,
        value: d.value,
        ma: d.ma,
        value2: d.value2,
        ma2: d.ma2,
      }))
  }, [primaryPts, primaryMA, comparePts, compareMA, compareMetric])

  const periodDateLabel = useMemo(() => {
    if (period === 'all' || filtered.length === 0) return ''
    const first = filtered[0].date
    const last = filtered[filtered.length - 1].date
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
    return `${fmt(first)} – ${fmt(last)}`
  }, [filtered, period])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="card p-3 text-xs shadow-lg" style={{ minWidth: 150 }}>
        <p className="font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} className="flex items-center gap-1.5" style={{ color: entry.color, marginTop: idx > 0 ? '2px' : 0 }}>
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: entry.color }} />
            {entry.name}: <strong>{entry.value}</strong>
          </p>
        ))}
        {primaryStats && (
          <p className="mt-1.5 pt-1.5 border-t" style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', borderColor: 'var(--color-border)' }}>
            Change: {primaryStats.absChange > 0 ? '+' : ''}{primaryStats.absChange.toFixed(primaryDef.precision)} {primaryDef.unit}
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Trends</h1>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className="px-3 py-1 rounded text-xs font-medium transition-colors"
              style={{
                background: period === p.key ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)',
                color: period === p.key ? '#fff' : 'var(--color-text-muted)',
              }}
            >{p.label}</button>
          ))}
        </div>
        {periodDateLabel && (
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{periodDateLabel}</span>
        )}
      </div>

      {/* Metric selectors */}
      <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div>
          <label className="text-[11px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>Primary Metric</label>
          <div className="flex flex-wrap gap-1.5">
            {METRIC_DEFINITIONS.map(md => {
              const has = records.some(r => r[md.key] !== undefined)
              if (!has) return null
              return (
                <button
                  key={md.key}
                  onClick={() => setPrimaryMetric(md.key)}
                  className="px-2.5 py-1 rounded-full text-xs transition-all"
                  style={{
                    background: primaryMetric === md.key ? md.color + '22' : 'rgba(255,255,255,0.05)',
                    color: primaryMetric === md.key ? md.color : 'var(--color-text-muted)',
                    border: `1px solid ${primaryMetric === md.key ? md.color + '55' : 'transparent'}`,
                  }}
                >{md.label}</button>
              )
            })}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>Compare with</label>
            {compareMetric && (
              <button
                onClick={() => setCompareMetric(null)}
                className="text-[10px] hover:underline" style={{ color: 'var(--color-text-muted)' }}
              >clear</button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCompareMetric(null)}
              className={`px-2.5 py-1 rounded-full text-xs transition-all ${!compareMetric ? 'ring-1 ring-white/20' : ''}`}
              style={{
                background: !compareMetric ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
                color: !compareMetric ? 'var(--color-text)' : 'var(--color-text-muted)',
              }}
            >None</button>
            {METRIC_DEFINITIONS.filter(md => md.key !== primaryMetric && records.some(r => r[md.key] !== undefined)).map(md => (
              <button
                key={md.key}
                onClick={() => setCompareMetric(md.key)}
                className="px-2.5 py-1 rounded-full text-xs transition-all"
                style={{
                  background: compareMetric === md.key ? md.color + '22' : 'rgba(255,255,255,0.05)',
                  color: compareMetric === md.key ? md.color : 'var(--color-text-muted)',
                  border: `1px solid ${compareMetric === md.key ? md.color + '55' : 'transparent'}`,
                }}
              >{md.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>
              {primaryDef.label} ({primaryDef.unit})
            </span>
            {compareDef && (
              <>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>vs</span>
                <span style={{ color: compareDef.color, fontWeight: 600 }}>
                  {compareDef.label} ({compareDef.unit})
                </span>
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>(scaled to same range)</span>
              </>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showMA} onChange={e => setShowMA(e.target.checked)} />
            7-pt moving avg
          </label>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              tickFormatter={v => v.toFixed(primaryDef.precision)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', color: 'var(--color-text-muted)' }}
            />
            <ReferenceLine
              y={primaryBaseline}
              stroke="rgba(255,255,255,0.15)"
              strokeDasharray="3 3"
              label={{ value: `Start ${primaryBaseline.toFixed(primaryDef.precision)}`, fill: 'var(--color-text-muted)', fontSize: 10, position: 'right' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={primaryDef.color}
              strokeWidth={1.5}
              dot={false}
              name={primaryDef.label}
              activeDot={{ r: 4, fill: primaryDef.color }}
            />
            {showMA && (
              <Line
                type="monotone"
                dataKey="ma"
                stroke={primaryDef.color}
                strokeWidth={2.5}
                dot={false}
                strokeDasharray="5 2"
                name={`${primaryDef.label} (MA7)`}
                opacity={0.6}
              />
            )}
            {compareMetric && (
              <>
                <Line
                  type="monotone"
                  dataKey="value2"
                  stroke={compareDef!.color}
                  strokeWidth={1.5}
                  dot={false}
                  name={compareDef!.label}
                  opacity={0.85}
                  activeDot={{ r: 4, fill: compareDef!.color }}
                  connectNulls
                  yAxisId="left"
                />
                {showMA && (
                  <Line
                    type="monotone"
                    dataKey="ma2"
                    stroke={compareDef!.color}
                    strokeWidth={2.5}
                    dot={false}
                    strokeDasharray="3 2"
                    name={`${compareDef!.label} (MA7)`}
                    opacity={0.5}
                    connectNulls
                    yAxisId="left"
                  />
                )}
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      {primaryStats && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          <div className="card p-3">
            <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Started</div>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{primaryStats.baseline.toFixed(primaryDef.precision)} <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>{primaryDef.unit}</span></div>
          </div>
          <div className="card p-3">
            <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Current</div>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{primaryStats.latest.toFixed(primaryDef.precision)} <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>{primaryDef.unit}</span></div>
          </div>
          <div className="card p-3">
            <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Change</div>
            <div className="text-lg font-bold" style={{ color: primaryStats.improved ? 'var(--color-success)' : 'var(--color-error)' }}>
              {primaryStats.absChange > 0 ? '+' : ''}{primaryStats.absChange.toFixed(primaryDef.precision)} <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>{primaryDef.unit}</span>
            </div>
          </div>
          <div className="card p-3">
            <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Best</div>
            <div className="text-lg font-bold" style={{ color: 'var(--color-success)' }}>{primaryDef.lowerIsBetter ? primaryStats.min : primaryStats.max} <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>{primaryDef.unit}</span></div>
          </div>
          <div className="card p-3">
            <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Average</div>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{primaryStats.avg.toFixed(primaryDef.precision)} <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>{primaryDef.unit}</span></div>
          </div>
          {primaryStats.streak > 1 && (
            <div className="card p-3">
              <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Streak</div>
              <div className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>🔥 {primaryStats.streak}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
