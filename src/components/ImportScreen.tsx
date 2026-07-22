import React, { useCallback, useState } from 'react'
import { parseCSV } from '../data/csvParser'
import type { BodyRecord } from '../types/metrics'

interface Props {
  onData: (records: BodyRecord[]) => void
  onDemo: () => void
}

export function ImportScreen({ onData, onDemo }: Props) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ records: BodyRecord[]; warnings: string[]; skipped: number } | null>(null)

  const processFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const result = parseCSV(text)
      if (result.records.length === 0) {
        setError('No valid records found. Check your CSV format.')
        return
      }
      setPreview(result)
    }
    reader.readAsText(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) processFile(file)
    else setError('Please drop a .csv file')
  }, [])

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="Body Evolution Analyst">
              <circle cx="16" cy="16" r="15" stroke="var(--color-primary)" strokeWidth="2"/>
              <path d="M10 22 L16 10 L22 22" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="16" cy="10" r="2" fill="var(--color-primary)"/>
            </svg>
            <span style={{ color: 'var(--color-primary)', fontSize: '1.25rem', fontWeight: 700 }}>Body Evolution Analyst</span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>Import your EufyLife CSV export and get AI-powered insights on your body composition evolution.</p>
        </div>

        {!preview ? (
          <>
            <div
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              className="rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all"
              style={{
                borderColor: dragging ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)',
                background: dragging ? 'rgba(79,152,163,0.05)' : 'var(--color-surface)',
              }}
              onClick={() => document.getElementById('csv-input')?.click()}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📁</div>
              <p style={{ color: 'var(--color-text)', marginBottom: '0.25rem', fontWeight: 600 }}>Drop your EufyLife CSV here</p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>or click to browse</p>
              <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={onFileInput} />
            </div>

            {error && (
              <p className="mt-3 text-sm text-center" style={{ color: 'var(--color-error)' }}>{error}</p>
            )}

            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>or</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            </div>

            <button
              onClick={onDemo}
              className="mt-4 w-full py-3 rounded-lg font-medium transition-all"
              style={{ background: 'rgba(79,152,163,0.15)', color: 'var(--color-primary)', border: '1px solid rgba(79,152,163,0.3)' }}
            >
              Try with demo data
            </button>
          </>
        ) : (
          <div className="rounded-xl p-6" style={{ background: 'var(--color-surface)' }}>
            <h2 className="font-semibold text-lg mb-1" style={{ color: 'var(--color-text)' }}>Preview</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              {preview.records.length} records found · {preview.skipped} skipped
            </p>
            {preview.warnings.map((w, i) => (
              <p key={i} className="text-sm mb-2 p-2 rounded" style={{ background: 'rgba(232,175,52,0.1)', color: 'var(--color-warning)' }}>{w}</p>
            ))}
            <div className="overflow-auto rounded" style={{ maxHeight: '200px', background: 'var(--color-surface-2)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {['Date','Weight','Body Fat','Muscle','BMI'].map(h => (
                      <th key={h} className="px-3 py-2 text-left" style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.records.slice(0, 8).map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>{r.date.toLocaleDateString()}</td>
                      <td className="px-3 py-2">{r.weight ?? '—'}</td>
                      <td className="px-3 py-2">{r.bodyFat ?? '—'}</td>
                      <td className="px-3 py-2">{r.muscleMass ?? '—'}</td>
                      <td className="px-3 py-2">{r.bmi ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setPreview(null)}
                className="flex-1 py-2 rounded-lg text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)' }}
              >Back</button>
              <button
                onClick={() => onData(preview.records)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >Load {preview.records.length} records →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
