import React from 'react'
import type { BodyRecord } from '../../types/metrics'
import { generateInsights } from '../../analytics/insights'

interface Props { records: BodyRecord[] }

const TYPE_STYLES = {
  positive: { bg: 'rgba(109,170,69,0.1)',  border: 'rgba(109,170,69,0.3)',  icon: '✅', color: '#6daa45' },
  neutral:  { bg: 'rgba(79,152,163,0.08)', border: 'rgba(79,152,163,0.25)', icon: 'ℹ️', color: '#4f98a3' },
  concern:  { bg: 'rgba(209,99,167,0.1)',  border: 'rgba(209,99,167,0.3)',  icon: '⚠️', color: '#d163a7' },
}

const CONFIDENCE_LABEL = {
  high: { label: 'High confidence', color: '#6daa45' },
  medium: { label: 'Medium confidence', color: '#e8af34' },
  low: { label: 'Low confidence', color: '#8892a4' },
}

export function InsightsTab({ records }: Props) {
  const insights = generateInsights(records)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Insights</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Data-driven interpretations — not clinical advice. Each insight cites the metrics and period used.
        </p>
      </div>

      {insights.length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
          <p>Not enough data to generate insights yet. Try loading more records.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {insights.map(insight => {
          const style = TYPE_STYLES[insight.type]
          const conf = CONFIDENCE_LABEL[insight.confidence]
          return (
            <div
              key={insight.id}
              className="rounded-xl p-5"
              style={{ background: style.bg, border: `1px solid ${style.border}` }}
            >
              <div className="flex items-start gap-3">
                <span style={{ fontSize: '1.1rem', marginTop: '1px' }}>{style.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 style={{ color: style.color, fontWeight: 600, fontSize: '0.95rem' }}>{insight.title}</h3>
                    <span style={{ fontSize: '0.7rem', color: conf.color, background: conf.color + '22', padding: '1px 6px', borderRadius: '999px' }}>
                      {conf.label}
                    </span>
                  </div>
                  <p style={{ color: 'var(--color-text)', fontSize: '0.875rem', lineHeight: 1.6 }}>{insight.body}</p>
                  <div className="flex flex-wrap gap-3 mt-3">
                    {insight.metrics.length > 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Metrics: {insight.metrics.join(', ')}
                      </span>
                    )}
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Period: {insight.period}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
