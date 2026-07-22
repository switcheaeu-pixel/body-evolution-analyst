import React, { useState, useRef, useCallback } from 'react'
import type { BodyRecord } from '../types/metrics'
import { parseCSV } from '../data/csvParser'
import { generateDemoData } from '../data/demoData'

interface Props {
  onData: (records: BodyRecord[]) => void
  onDemo: () => void
  existingRecordsCount: number
}

interface PreviewState {
  records: BodyRecord[]
  members: { name: string; count: number }[]
  errors:  string[]
}

function memberColor(name: string): string {
  const COLORS = ['#00d4c8','#22c55e','#f59e0b','#a78bfa','#f43f5e','#60a5fa','#fb923c']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

export function ImportScreen({ onData, onDemo, existingRecordsCount }: Props) {
  const [dragging,  setDragging]  = useState(false)
  const [preview,   setPreview]   = useState<PreviewState | null>(null)
  const [loading,   setLoading]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback((file: File) => {
    setLoading(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { records, errors } = parseCSV(text)
      const counts: Record<string, number> = {}
      records.forEach(r => {
        const m = r.familyMember ?? 'Unknown'
        counts[m] = (counts[m] ?? 0) + 1
      })
      const members = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }))
      setPreview({ records, members, errors })
      setLoading(false)
    }
    reader.readAsText(file, 'UTF-8')
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) processFile(file)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const handleConfirm = () => {
    if (preview?.records.length) onData(preview.records)
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
    }}>

      {/* ── Hero wordmark ── */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.7rem', marginBottom: '0.75rem' }}>
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="10" fill="rgba(0,212,200,0.12)" />
            <path d="M8 22 L14 13 L18 18 L22 10" stroke="#00d4c8" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="22" cy="10" r="2.5" fill="#00d4c8" />
          </svg>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'clamp(1.6rem, 5vw, 2.2rem)',
            letterSpacing: '-0.03em',
            color: 'var(--color-text)',
          }}>
            Body<span style={{ color: 'var(--color-primary)' }}>Evo</span>
          </h1>
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', maxWidth: 360, margin: '0 auto', lineHeight: 1.5 }}>
          Import your body composition data and track how you&apos;ve been evolving over time.
        </p>
      </div>

      {/* ── Upload card ── */}
      {!preview ? (
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragging ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
              borderRadius: 'var(--radius-2xl)',
              background: dragging ? 'rgba(0,212,200,0.05)' : 'var(--color-surface)',
              padding: '3rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s var(--ease-spring)',
              boxShadow: dragging ? 'var(--shadow-glow)' : 'none',
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: dragging ? 'var(--color-primary-mid)' : 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem',
              fontSize: '1.6rem',
              transition: 'all 0.2s',
            }}>
              {loading ? '⟳' : dragging ? '↓' : '⬆'}
            </div>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)', marginBottom: '0.4rem' }}>
              {loading ? 'Processing…' : 'Drop your CSV here'}
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
              EufyLife export &middot; or <span style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>browse files</span>
            </p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>

          {/* Separator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', fontWeight: 500 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>

          <button
            onClick={onDemo}
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', fontSize: '0.875rem' }}
          >
            ✦ Try with demo data
          </button>

          {existingRecordsCount > 0 && (
            <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              {existingRecordsCount} records already loaded
            </p>
          )}
        </div>
      ) : (

        /* ── Preview panel ── */
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)' }}>
                ✓ {preview.records.length} records detected
              </p>
              <button
                onClick={() => setPreview(null)}
                style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem' }}
              >← Back</button>
            </div>

            {/* Members detected */}
            {preview.members.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <p className="section-heading" style={{ marginBottom: '0.6rem' }}>Members detected</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {preview.members.map(m => (
                    <div key={m.name} className="member-pill" style={{
                      borderColor: `${memberColor(m.name)}44`,
                      background:  `${memberColor(m.name)}14`,
                      color:        memberColor(m.name),
                      fontWeight: 600,
                    }}>
                      <span className="member-avatar" style={{
                        background: memberColor(m.name),
                        color: '#0a0b0f',
                      }}>{m.name.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || '?'}</span>
                      {m.name}
                      <span style={{ fontSize: '0.68rem', opacity: 0.7, background: 'rgba(0,0,0,0.2)', borderRadius: 99, padding: '1px 5px' }}>{m.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview rows */}
            <div style={{ marginBottom: '1rem' }}>
              <p className="section-heading" style={{ marginBottom: '0.5rem' }}>Preview (first 4 rows)</p>
              <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                {preview.records.slice(0, 4).map((r, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                    padding: '0.55rem 0.85rem',
                    fontSize: '0.78rem',
                    borderBottom: i < 3 ? '1px solid var(--color-border)' : 'none',
                    color: 'var(--color-text-muted)',
                  }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{r.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                    <span>{r.weight != null ? `${r.weight} kg` : '—'}</span>
                    <span>{r.familyMember ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Errors */}
            {preview.errors.length > 0 && (
              <div style={{ marginBottom: '1rem', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-md)', background: 'var(--color-error-dim)', border: '1px solid rgba(244,63,94,0.2)' }}>
                <p style={{ color: 'var(--color-error)', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>⚠ {preview.errors.length} parsing issue(s)</p>
                <p style={{ color: 'var(--color-error)', fontSize: '0.72rem', opacity: 0.8 }}>{preview.errors[0]}</p>
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={preview.records.length === 0}
              onClick={handleConfirm}
            >
              Import {preview.records.length} records →
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-faint)' }}>
            All data stays in your browser. Nothing is uploaded.
          </p>
        </div>
      )}
    </div>
  )
}
