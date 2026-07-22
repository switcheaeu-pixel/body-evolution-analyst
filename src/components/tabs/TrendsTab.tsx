import React, { useState } from 'react'
import type { BodyRecord, MetricKey } from '../../types/metrics'
import { METRIC_DEFINITIONS } from '../../types/metrics'
import { filterByPeriod, getValues, rollingAverage } from '../../analytics/engine'
import type { PeriodKey } from '../../analytics/engine'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

interface Props { records: BodyRecord[] }

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: '6m',  label: '6M' },
  { key: '1y',  label: '1Y' },
  { key: 'all', label: 'All' },
]

export function TrendsTab({ records }: Props) {
  const [period, setPeriod] = useState<PeriodKey>('all')
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('weight')
  const [showMA, setShowMA] = useState(true)

  const filtered = filterByPeriod(records, period)
  const pts = getValues(filtered, selectedMetric)
  const values = pts.map(p => p.value)
  const ma = rollingAverage(values, 7)

  const chartData = pts.map((p, i) => ({
    date: p.date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
    value: p.value,
    ma: +ma[i].toFixed(2),
  }))

  const metricDef = METRIC_DEFINITIONS.find(m => m.key === selectedMetric)!

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Trends</h1>
        <div className="flex gap-1 ml-auto">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className="px-3 py-1 rounded text-xs font-medium"
              style={{
                background: period === p.key ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)',
                color: period === p.key ? '#fff' : 'var(--color-text-muted)',
              }}
            >{p.label}</button>
          ))}
        </div>
      </div>

      {/* Metric selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {METRIC_DEFINITIONS.map(md => {
          const has = records.some(r => r[md.key] !== undefined)
          if (!has) return null
          return (
            <button
              key={md.key}
              onClick={() => setSelectedMetric(md.key)}
              className="px-3 py-1 rounded-full text-sm transition-all"
              style={{
                background: selectedMetric === md.key ? md.color + '22' : 'rgba(255,255,255,0.05)',
                color: selectedMetric === md.key ? md.color : 'var(--color-text-muted)',
                border: `1px solid ${selectedMetric === md.key ? md.color + '55' : 'transparent'}`,
              }}
            >{md.label}</button>
          )
        })}
      </div>

      {/* Chart */}
      <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{metricDef.label} ({metricDef.unit})</span>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showMA} onChange={e => setShowMA(e.target.checked)} />
            7-pt moving avg
          </label>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)' }}
            />
            <Line type="monotone" dataKey="value" stroke={metricDef.color} strokeWidth={1.5} dot={false} name={metricDef.label} />
            {showMA && <Line type="monotone" dataKey="ma" stroke={metricDef.color} strokeWidth={2} dot={false} strokeDasharray="4 2" name="Moving Avg" opacity={0.7} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
