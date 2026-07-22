import React from 'react'
import type { BodyRecord } from '../../types/metrics'
import { generateEvolutionSummary } from '../../analytics/insights'

interface Props { records: BodyRecord[] }

function Section({ title, content, icon }: { title: string; content: string; icon: string }) {
  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
        <h3 style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.95rem' }}>{title}</h3>
      </div>
      <p style={{ color: 'var(--color-text)', fontSize: '0.875rem', lineHeight: 1.7 }}>{content}</p>
    </div>
  )
}

export function SnapshotTab({ records }: Props) {
  const summary = generateEvolutionSummary(records)
  const last = records[records.length - 1]

  const handleExport = () => {
    const lines = [
      '# Body Evolution Snapshot',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      '## Where I Started',
      summary.start,
      '',
      '## Where I Am Now',
      summary.now,
      '',
      '## What Improved',
      summary.improved,
      '',
      '## What Changed Recently',
      summary.recent,
      '',
      '## What Deserves Attention',
      summary.attention,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `body-snapshot-${new Date().toISOString().slice(0,10)}.txt`
    a.click()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Evolution Snapshot</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>A human-readable summary of how your body has been evolving.</p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'rgba(79,152,163,0.15)', color: 'var(--color-primary)', border: '1px solid rgba(79,152,163,0.3)' }}
        >⬇ Export .txt</button>
      </div>

      <div className="flex flex-col gap-4">
        <Section icon="📅" title="Where I Started"      content={summary.start || 'Insufficient data'} />
        <Section icon="📍" title="Where I Am Now"       content={summary.now   || 'Insufficient data'} />
        <Section icon="✅" title="What Improved Most"   content={summary.improved || 'No clear improvements yet'} />
        <Section icon="🔄" title="What Changed Recently" content={summary.recent || 'No significant changes in last 30 days'} />
        <Section icon="⚠️" title="What Deserves Attention" content={summary.attention || 'No concerns detected'} />
      </div>

      <div className="mt-6 p-4 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--color-text-muted)' }}>
        ⚠️ This analysis is data-driven and informational only. It is not medical advice. Consult a healthcare professional for clinical guidance.
      </div>
    </div>
  )
}
