import React from 'react'
import type { BodyRecord } from '../../types/metrics'
import { generateInsights } from '../../analytics/insights'

interface Props { records: BodyRecord[] }

const TYPE_CONFIG = {
  positive: { bg: 'rgba(109,170,69,0.08)', border: 'rgba(109,170,69,0.25)', accent: '#6daa45', icon: '✅', label: 'Improvements' },
  concern:  { bg: 'rgba(209,99,167,0.08)', border: 'rgba(209,99,167,0.25)',  accent: '#d163a7', icon: '⚠️', label: 'Needs Attention' },
  neutral:  { bg: 'rgba(79,152,163,0.06)', border: 'rgba(79,152,163,0.2)',   accent: '#4f98a3', icon: 'ℹ️', label: 'Observations' },
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: '#6daa45',
  medium: '#e8af34',
  low: '#8892a4',
}

export function InsightsTab({ records }: Props) {
  const insights = generateInsights(records)

  const positiveInsights = insights.filter(i => i.type === 'positive')
  const concernInsights = insights.filter(i => i.type === 'concern')
  const neutralInsights = insights.filter(i => i.type === 'neutral')

  const groups: { type: 'positive' | 'concern' | 'neutral'; list: typeof insights }[] = [
    { type: 'positive', list: positiveInsights },
    { type: 'concern',  list: concernInsights },
    { type: 'neutral',  list: neutralInsights },
  ]

  if (insights.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Insights</h1>
        <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
          <p>Not enough data to generate insights yet. Try loading more records.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Insights</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          Data-driven interpretations — not clinical advice.
        </p>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-3 mb-6">
        {positiveInsights.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: TYPE_CONFIG.positive.bg, border: `1px solid ${TYPE_CONFIG.positive.border}`, color: TYPE_CONFIG.positive.accent }}>
            <span>{TYPE_CONFIG.positive.icon}</span>
            <strong>{positiveInsights.length}</strong> {TYPE_CONFIG.positive.label}
          </div>
        )}
        {concernInsights.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: TYPE_CONFIG.concern.bg, border: `1px solid ${TYPE_CONFIG.concern.border}`, color: TYPE_CONFIG.concern.accent }}>
            <span>{TYPE_CONFIG.concern.icon}</span>
            <strong>{concernInsights.length}</strong> {TYPE_CONFIG.concern.label}
          </div>
        )}
        {neutralInsights.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: TYPE_CONFIG.neutral.bg, border: `1px solid ${TYPE_CONFIG.neutral.border}`, color: TYPE_CONFIG.neutral.accent }}>
            <span>{TYPE_CONFIG.neutral.icon}</span>
            <strong>{neutralInsights.length}</strong> {TYPE_CONFIG.neutral.label}
          </div>
        )}
      </div>

      {/* Grouped insights */}
      {groups.map(group => {
        if (group.list.length === 0) return null
        const cfg = TYPE_CONFIG[group.type]

        return (
          <div key={group.type} className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
              style={{ color: cfg.accent }}>
              <span style={{
                display: 'inline-block',
                width: 3,
                height: 14,
                borderRadius: 2,
                background: cfg.accent,
              }} />
              {cfg.icon} {cfg.label} ({group.list.length})
            </h3>

            <div className="flex flex-col gap-2.5">
              {group.list.map(insight => {
                const confColor = CONFIDENCE_COLORS[insight.confidence]

                return (
                  <div key={insight.id} className="rounded-xl p-4 transition-colors"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    {/* Header row: icon + title + confidence */}
                    <div className="flex items-start gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                            {insight.title}
                          </span>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{ background: confColor + '22', color: confColor }}>
                            {insight.confidence.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <p className="text-sm leading-relaxed mb-2.5" style={{ color: 'var(--color-text-muted)' }}>
                      {insight.body}
                    </p>

                    {/* Footer: metrics + period */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px]"
                      style={{ color: 'var(--color-text-faint)', borderTop: `1px solid ${cfg.border}`, paddingTop: '8px' }}>
                      {insight.metrics.length > 0 && (
                        <span className="flex items-center gap-1.5">
                          <span style={{ color: cfg.accent }}>◆</span>
                          {insight.metrics.join(', ')}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <span style={{ color: cfg.accent }}>◷</span>
                        {insight.period}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Disclaimer */}
      <div className="mt-6 p-3 rounded-lg text-xs"
        style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
        This analysis is data-driven and informational only. It is not medical advice. Consult a healthcare professional for clinical guidance.
      </div>
    </div>
  )
}
