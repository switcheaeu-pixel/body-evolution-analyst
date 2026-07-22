import React, { useState, useRef } from 'react'
import type { BodyRecord } from '../types/metrics'
import { parseCSV } from '../data/csvParser'
import { getMergeDiff } from '../data/storage'
import { OverviewTab }  from './tabs/OverviewTab'
import { TrendsTab }    from './tabs/TrendsTab'
import { InsightsTab }  from './tabs/InsightsTab'
import { SnapshotTab }  from './tabs/SnapshotTab'
import { ProgressTab }  from './tabs/ProgressTab'

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: '▦' },
  { id: 'trends',    label: 'Trends',    icon: '↗' },
  { id: 'progress',  label: 'Progress',  icon: '⊟' },
  { id: 'insights',  label: 'Insights',  icon: '◈' },
  { id: 'snapshot',  label: 'Snapshot',  icon: '⊕' },
]

function memberColor(name: string): string {
  const COLORS = ['#00d4c8','#22c55e','#f59e0b','#a78bfa','#f43f5e','#60a5fa','#fb923c']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

interface Props {
  records:        BodyRecord[]
  allRecords:     BodyRecord[]
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
  const [tab, setTab]                           = useState('overview')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [importMessage, setImportMessage]       = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const result = parseCSV(text)
      if (result.records.length === 0) {
        setImportMessage('\u26a0\ufe0f No valid records found in file.')
        setTimeout(() => setImportMessage(null), 4000)
        return
      }
      const { added, updated } = getMergeDiff(allRecords, result.records)
      setImportMessage(`\u2713 ${result.records.length} records imported — ${added} new, ${updated} updated`)
      onImportMore(result.records)
      setTimeout(() => setImportMessage(null), 4500)
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  const handleClear = () => { onClearData(); setShowClearConfirm(false) }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>

      {/* ══ App header ═══════════════════════════════════════════════ */}
      <header style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: '1rem',
        padding: '0 1.5rem',
        height: 56,
        background: 'rgba(17,19,24,0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexShrink: 0 }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-label="logo">
            <rect width="32" height="32" rx="8" fill="rgba(0,212,200,0.12)" />
            <path d="M8 22 L14 13 L18 18 L22 10" stroke="#00d4c8" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="22" cy="10" r="2.5" fill="#00d4c8" />
          </svg>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '0.95rem',
            color: 'var(--color-text)',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
          }}>Body<span style={{ color: 'var(--color-primary)' }}>Evo</span></span>
        </div>

        {/* Member switcher — centre */}
        {members.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', overflow: 'hidden' }}>
            {members.map(m => {
              const isActive = m === activeMember
              const color    = memberColor(m)
              const initials = m.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || '?'
              return (
                <button
                  key={m}
                  onClick={() => onMemberChange(m)}
                  title={m}
                  className="member-pill"
                  style={{
                    borderColor:  isActive ? color : 'var(--color-border)',
                    background:   isActive ? `${color}1a` : 'rgba(255,255,255,0.03)',
                    color:        isActive ? color : 'var(--color-text-muted)',
                    fontWeight:   isActive ? 700 : 400,
                  }}
                >
                  <span className="member-avatar" style={{
                    background: isActive ? color : 'rgba(255,255,255,0.08)',
                    color:      isActive ? '#0a0b0f' : 'var(--color-text-muted)',
                  }}>{initials}</span>
                  {m}
                  {isActive && (
                    <span style={{ fontSize: '0.68rem', opacity: 0.6,
                      background: 'rgba(0,0,0,0.25)', borderRadius: '99px',
                      padding: '1px 5px' }}>
                      {records.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <button className="btn btn-teal-ghost btn-sm" onClick={() => fileInputRef.current?.click()}>
            + Import
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} />

          {!showClearConfirm ? (
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)', borderColor: 'rgba(244,63,94,0.2)', background: 'rgba(244,63,94,0.06)' }}
              onClick={() => setShowClearConfirm(true)}>Clear</button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Delete all?</span>
              <button className="btn btn-sm" style={{ background: 'var(--color-error)', color: '#fff' }} onClick={handleClear}>Yes</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowClearConfirm(false)}>No</button>
            </div>
          )}

          <button className="btn btn-ghost btn-sm" onClick={onReset}
            style={{ color: 'var(--color-text-faint)', border: 'none', background: 'none', padding: '0.35rem 0.5rem' }}
            title="Back to import screen">✕</button>
        </div>
      </header>

      {/* Toast */}
      {importMessage && (
        <div className="animate-toast" style={{
          position: 'fixed', top: '68px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.55rem 1.1rem',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-surface-3)',
          border: '1px solid rgba(0,212,200,0.25)',
          color: 'var(--color-primary)',
          fontSize: '0.82rem', fontWeight: 600,
          boxShadow: 'var(--shadow-lg)',
        }}>
          {importMessage}
        </div>
      )}

      {/* ══ Tab nav ══════════════════════════════════════════════════ */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        padding: '0 1.5rem',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        overflowX: 'auto',
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`tab-item ${tab === t.id ? 'active' : ''}`}
          >
            <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* ══ Content ══════════════════════════════════════════════════ */}
      <main className="flex-1 overflow-auto" style={{ padding: '1.5rem' }}>
        <div className="animate-fade-in-up">
          {tab === 'overview'  && <OverviewTab records={records} />}
          {tab === 'trends'    && <TrendsTab   records={records} />}
          {tab === 'progress'  && <ProgressTab records={records} />}
          {tab === 'insights'  && <InsightsTab records={records} />}
          {tab === 'snapshot'  && <SnapshotTab records={records} />}
        </div>
      </main>
    </div>
  )
}
