import React, { useState, useRef } from 'react'
import type { BodyRecord } from '../types/metrics'
import { parseCSV } from '../data/csvParser'
import { getMergeDiff } from '../data/storage'
import { OverviewTab } from './tabs/OverviewTab'
import { TrendsTab } from './tabs/TrendsTab'
import { InsightsTab } from './tabs/InsightsTab'
import { SnapshotTab } from './tabs/SnapshotTab'
import { ProgressTab } from './tabs/ProgressTab'

const TABS = [
  { id: 'overview',  label: '📊 Overview' },
  { id: 'trends',    label: '📈 Trends' },
  { id: 'progress',  label: '📋 Progress' },
  { id: 'insights',  label: '💡 Insights' },
  { id: 'snapshot',  label: '📝 Snapshot' },
]

/** Generate a consistent accent colour from a string (for avatars) */
function memberColor(name: string): string {
  const COLORS = ['#4f98a3','#6daa45','#da7101','#a86fdf','#d19900','#dd6974','#5591c7']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

interface Props {
  records:        BodyRecord[]   // filtered to activeMember
  allRecords:     BodyRecord[]   // all members — used for record count in header
  members:        string[]
  activeMember:   string
  onMemberChange: (m: string) => void
  onReset:        () => void
  onClearData:    () => void
  onImportMore:   (data: BodyRecord[]) => void
}

export function Dashboard({
  records, allRecords, members, activeMember, onMemberChange,
  onReset, onClearData, onImportMore,
}: Props) {
  const [tab, setTab]                       = useState('overview')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [importMessage, setImportMessage]   = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Import more CSV from dashboard ──────────────────────────────────────
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      // Parse ALL members — App will merge and keep everyone
      const result = parseCSV(text)
      if (result.records.length === 0) {
        setImportMessage('No valid records found in file.')
        setTimeout(() => setImportMessage(null), 4000)
        return
      }
      const { added, updated } = getMergeDiff(allRecords, result.records)
      setImportMessage(`Imported ${result.records.length} records: ${added} new, ${updated} updated.`)
      onImportMore(result.records)
      setTimeout(() => setImportMessage(null), 4000)
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  const handleClear = () => { onClearData(); setShowClearConfirm(false) }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className="flex items-center gap-4 px-6 py-3 border-b"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        {/* Logo + title */}
        <div className="flex items-center gap-2 shrink-0">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-label="logo">
            <circle cx="16" cy="16" r="15" stroke="var(--color-primary)" strokeWidth="2"/>
            <path d="M10 22 L16 10 L22 22" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="16" cy="10" r="2" fill="var(--color-primary)"/>
          </svg>
          <span style={{ fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>Body Evolution Analyst</span>
        </div>

        {/* ── Member switcher ──────────────────────────────────────────── */}
        {members.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ color: 'var(--color-text-faint)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Viewing:</span>
            {members.map(m => {
              const isActive = m === activeMember
              const color    = memberColor(m)
              const initials = m.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || '?'
              return (
                <button
                  key={m}
                  onClick={() => onMemberChange(m)}
                  title={m}
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    gap:            '6px',
                    padding:        '4px 10px 4px 6px',
                    borderRadius:   '999px',
                    border:         `1.5px solid ${isActive ? color : 'rgba(255,255,255,0.1)'}`,
                    background:     isActive ? `${color}22` : 'rgba(255,255,255,0.04)',
                    color:          isActive ? color : 'var(--color-text-muted)',
                    fontWeight:     isActive ? 600 : 400,
                    fontSize:       '0.8rem',
                    cursor:         'pointer',
                    transition:     'all 140ms ease',
                    whiteSpace:     'nowrap',
                  }}
                >
                  {/* Avatar circle */}
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: isActive ? color : 'rgba(255,255,255,0.1)',
                    color: isActive ? '#fff' : 'var(--color-text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem', fontWeight: 700, flexShrink: 0,
                  }}>{initials}</span>
                  {m}
                  {isActive && <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{records.length}</span>}
                </button>
              )
            })}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* ── Right actions ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-sm px-3 py-1 rounded"
            style={{ background: 'rgba(79,152,163,0.12)', color: 'var(--color-primary)', whiteSpace: 'nowrap' }}
          >+ Import CSV</button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} />

          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-sm px-3 py-1 rounded"
              style={{ background: 'rgba(209,99,167,0.1)', color: 'var(--color-error)', whiteSpace: 'nowrap' }}
            >Clear data</button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Delete all?</span>
              <button onClick={handleClear} className="text-sm px-3 py-1 rounded font-semibold"
                style={{ background: 'var(--color-error)', color: '#fff' }}>Yes, clear</button>
              <button onClick={() => setShowClearConfirm(false)} className="text-sm px-3 py-1 rounded"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }}>Cancel</button>
            </div>
          )}

          <button onClick={onReset} className="text-sm px-3 py-1 rounded"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>← Start over</button>
        </div>
      </header>

      {/* Import feedback toast */}
      {importMessage && (
        <div className="mx-6 mt-3 px-4 py-2 rounded-lg text-sm flex items-center gap-2"
          style={{ background: 'rgba(79,152,163,0.1)', border: '1px solid rgba(79,152,163,0.2)', color: 'var(--color-primary)' }}>
          ✅ {importMessage}
        </div>
      )}

      {/* Tabs */}
      <nav className="flex gap-1 px-6 pt-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2 text-sm rounded-t-lg transition-all"
            style={{
              color:        tab === t.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: tab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              background:   tab === t.id ? 'rgba(79,152,163,0.08)' : 'transparent',
              fontWeight:   tab === t.id ? 600 : 400,
            }}
          >{t.label}</button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 p-6 overflow-auto">
        {tab === 'overview'  && <OverviewTab records={records} />}
        {tab === 'trends'    && <TrendsTab   records={records} />}
        {tab === 'progress'  && <ProgressTab records={records} />}
        {tab === 'insights'  && <InsightsTab records={records} />}
        {tab === 'snapshot'  && <SnapshotTab records={records} />}
      </main>
    </div>
  )
}
