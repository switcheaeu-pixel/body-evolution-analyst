import React, { useCallback, useRef, useState } from 'react'
import { parseCSV } from '../data/csvParser'
import type { BodyRecord } from '../types/metrics'

interface Props {
  onData: (records: BodyRecord[]) => void
  onDemo: () => void
  existingRecordsCount?: number
}

type Step = 'drop' | 'pick-member' | 'preview'

export function ImportScreen({ onData, onDemo, existingRecordsCount }: Props) {
  const [dragging, setDragging]     = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [step, setStep]             = useState<Step>('drop')
  const [rawText, setRawText]       = useState<string>('')
  const [members, setMembers]       = useState<string[]>([])
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [preview, setPreview]       = useState<{
    records:         BodyRecord[]
    warnings:        string[]
    skipped:         number
    detectedColumns: string[]
  } | null>(null)
  const dragCounter = useRef(0)

  // ── Step 1: read raw text, detect members ────────────────────────────────
  const processFile = (file: File) => {
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setRawText(text)

      // Parse without member filter to discover all members
      const initial = parseCSV(text)

      if (initial.records.length === 0) {
        setError(`No valid records found. ${initial.warnings.join(' ')}`)
        return
      }

      if (initial.members && initial.members.length > 1) {
        // Multiple family members — ask the user to pick one
        setMembers(initial.members)
        // Auto-select the member with the most records
        const counts: Record<string, number> = {}
        initial.records.forEach(r => {
          if (r.familyMember) counts[r.familyMember] = (counts[r.familyMember] ?? 0) + 1
        })
        const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? initial.members[0]
        setSelectedMember(best)
        setStep('pick-member')
      } else {
        // Single member or no member field — go straight to preview
        const member = initial.members?.[0] ?? ''
        applyFilter(text, member)
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  // ── Step 2: apply member filter and show preview ─────────────────────────
  const applyFilter = (text: string, member: string) => {
    const result = parseCSV(text, member || undefined)
    if (result.records.length === 0) {
      setError(`No records found for "${member}". ${result.warnings.join(' ')}`)
      setStep('drop')
      return
    }
    setPreview(result)
    setStep('preview')
  }

  // ── Drag & drop handlers ─────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setDragging(false); dragCounter.current = 0
    const file = e.dataTransfer.files[0]
    if (file?.name.toLowerCase().endsWith('.csv')) processFile(file)
    else setError('Please drop a .csv file')
  }, [])

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.items?.length > 0) setDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) setDragging(false)
  }, [])

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const reset = () => {
    setStep('drop'); setPreview(null); setError(null)
    setMembers([]); setSelectedMember(''); setRawText('')
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="Body Evolution Analyst">
              <circle cx="16" cy="16" r="15" stroke="var(--color-primary)" strokeWidth="2"/>
              <path d="M10 22 L16 10 L22 22" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="16" cy="10" r="2" fill="var(--color-primary)"/>
            </svg>
            <span style={{ color: 'var(--color-primary)', fontSize: '1.2rem', fontWeight: 700 }}>Body Evolution Analyst</span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Import your EufyLife CSV export and get insights on your body composition evolution.
          </p>
          {existingRecordsCount != null && existingRecordsCount > 0 && (
            <p className="mt-2 text-xs px-3 py-1.5 rounded-lg inline-block"
              style={{ background: 'rgba(79,152,163,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(79,152,163,0.2)' }}>
              You have {existingRecordsCount} saved records. New CSV data will be merged — same-date records update, new dates are added.
            </p>
          )}
        </div>

        {/* ── STEP: drop ── */}
        {step === 'drop' && (
          <>
            <div
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              className="rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all"
              style={{
                borderColor: dragging ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)',
                background:  dragging ? 'rgba(79,152,163,0.05)' : 'var(--color-surface)',
              }}
              onClick={() => document.getElementById('csv-input')?.click()}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📁</div>
              <p style={{ color: 'var(--color-text)', fontWeight: 600, marginBottom: '0.25rem' }}>Drop your EufyLife CSV here</p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Composition or measurements file — or click to browse</p>
              <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={onFileInput} />
            </div>

            {error && (
              <div className="mt-3 p-3 rounded-lg text-sm" style={{ background: 'rgba(209,99,167,0.1)', color: 'var(--color-error)' }}>
                {error}
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>or</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            </div>

            <button
              onClick={onDemo}
              className="mt-4 w-full py-3 rounded-lg font-medium transition-all"
              style={{ background: 'rgba(79,152,163,0.12)', color: 'var(--color-primary)', border: '1px solid rgba(79,152,163,0.3)' }}
            >
              Try with demo data
            </button>
          </>
        )}

        {/* ── STEP: pick-member ── */}
        {step === 'pick-member' && (
          <div className="rounded-xl p-5" style={{ background: 'var(--color-surface)' }}>
            <h2 className="font-semibold text-lg mb-1" style={{ color: 'var(--color-text)' }}>Multiple users detected</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              This file contains data for <strong style={{ color: 'var(--color-primary)' }}>{members.length} family members</strong>.
              Select whose data to analyse:
            </p>

            <div className="flex flex-col gap-2 mb-5">
              {members.map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedMember(m)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all"
                  style={{
                    background: selectedMember === m ? 'rgba(79,152,163,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${selectedMember === m ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)'}`,
                    color: 'var(--color-text)',
                  }}
                >
                  <span
                    style={{
                      width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700,
                      background: selectedMember === m ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)',
                      color: selectedMember === m ? '#fff' : 'var(--color-text-muted)',
                      flexShrink: 0,
                    }}
                  >
                    {m.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium">{m}</span>
                  {selectedMember === m && (
                    <span className="ml-auto text-xs" style={{ color: 'var(--color-primary)' }}>✓ selected</span>
                  )}
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-3 p-3 rounded-lg text-sm" style={{ background: 'rgba(209,99,167,0.1)', color: 'var(--color-error)' }}>
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 py-2 rounded-lg text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)' }}
              >← Back</button>
              <button
                onClick={() => applyFilter(rawText, selectedMember)}
                disabled={!selectedMember}
                className="flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{
                  background: selectedMember ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)',
                  color: selectedMember ? '#fff' : 'var(--color-text-faint)',
                  cursor: selectedMember ? 'pointer' : 'not-allowed',
                }}
              >Analyse {selectedMember || '…'} →</button>
            </div>
          </div>
        )}

        {/* ── STEP: preview ── */}
        {step === 'preview' && preview && (
          <div className="rounded-xl p-5" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>Preview</h2>
              {selectedMember && (
                <span style={{ fontSize: '0.75rem', background: 'rgba(79,152,163,0.12)', color: 'var(--color-primary)', padding: '2px 10px', borderRadius: '999px' }}>
                  {selectedMember}
                </span>
              )}
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              <strong style={{ color: 'var(--color-primary)' }}>{preview.records.length}</strong> records
              {preview.skipped > 0 && <> · <span style={{ color: 'var(--color-warning)' }}>{preview.skipped} skipped</span></>}
            </p>

            {preview.detectedColumns.length > 0 && (
              <div className="mb-3">
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: '0.4rem' }}>Detected metrics:</p>
                <div className="flex flex-wrap gap-1">
                  {preview.detectedColumns.map(col => (
                    <span key={col} style={{ fontSize: '0.7rem', background: 'rgba(79,152,163,0.12)', color: 'var(--color-primary)', padding: '2px 7px', borderRadius: '999px' }}>{col}</span>
                  ))}
                </div>
              </div>
            )}

            {preview.warnings.filter(w => !w.startsWith('Filtered')).map((w, i) => (
              <p key={i} className="text-xs mb-2 p-2 rounded" style={{ background: 'rgba(232,175,52,0.1)', color: 'var(--color-warning)' }}>{w}</p>
            ))}

            <div className="overflow-auto rounded" style={{ maxHeight: '180px', background: 'rgba(0,0,0,0.2)' }}>
              <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Date', 'Weight', 'Body Fat', 'Muscle', 'Waist', 'BMI'].map(h => (
                      <th key={h} className="px-3 py-2 text-left whitespace-nowrap"
                        style={{ color: 'var(--color-text-muted)', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.records.slice(-10).reverse().map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-3 py-1.5" style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{r.date.toLocaleDateString()}</td>
                      <td className="px-3 py-1.5">{r.weight    ?? '—'}</td>
                      <td className="px-3 py-1.5">{r.bodyFat   ?? '—'}</td>
                      <td className="px-3 py-1.5">{r.muscleMass ?? '—'}</td>
                      <td className="px-3 py-1.5">{r.waistCm   ?? '—'}</td>
                      <td className="px-3 py-1.5">{r.bmi       ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => members.length > 1 ? setStep('pick-member') : reset()}
                className="flex-1 py-2 rounded-lg text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)' }}
              >← Back</button>
              <button
                onClick={() => onData(preview.records)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >Analyse {preview.records.length} records →</button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
