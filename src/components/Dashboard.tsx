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

interface Props {
  records: BodyRecord[]
  onReset: () => void
  onClearData: () => void
  onImportMore: (data: BodyRecord[]) => void
}

export function Dashboard({ records, onReset, onClearData, onImportMore }: Props) {
  const [tab, setTab] = useState('overview')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const result = parseCSV(text)
      if (result.records.length === 0) {
        setImportMessage('No valid records found in file.')
        return
      }
      const { added, updated } = getMergeDiff(records, result.records)
      setImportMessage(`${result.records.length} records imported: ${added} new, ${updated} updated.`)
      onImportMore(result.records)
      setTimeout(() => setImportMessage(null), 4000)
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  const handleClear = () => {
    onClearData()
    setShowClearConfirm(false)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <div className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-label="logo">
            <circle cx="16" cy="16" r="15" stroke="var(--color-primary)" strokeWidth="2"/>
            <path d="M10 22 L16 10 L22 22" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="16" cy="10" r="2" fill="var(--color-primary)"/>
          </svg>
          <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>Body Evolution Analyst</span>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{records.length} records</span>

          {/* Import more */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-sm px-3 py-1 rounded"
            style={{ background: 'rgba(79,152,163,0.12)', color: 'var(--color-primary)' }}
          >+ Import CSV</button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileImport}
          />

          {/* Clear data */}
          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-sm px-3 py-1 rounded"
              style={{ background: 'rgba(209,99,167,0.1)', color: 'var(--color-error)' }}
            >Clear data</button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Delete all?</span>
              <button
                onClick={handleClear}
                className="text-sm px-3 py-1 rounded font-semibold"
                style={{ background: 'var(--color-error)', color: '#fff' }}
              >Yes, clear</button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="text-sm px-3 py-1 rounded"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }}
              >Cancel</button>
            </div>
          )}

          <button
            onClick={onReset}
            className="text-sm px-3 py-1 rounded"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }}
          >← Start over</button>
        </div>
      </header>

      {/* Import feedback toast */}
      {importMessage && (
        <div className="mx-6 mt-3 px-4 py-2 rounded-lg text-sm flex items-center gap-2"
          style={{ background: 'rgba(79,152,163,0.1)', border: '1px solid rgba(79,152,163,0.2)', color: 'var(--color-primary)' }}>
          <span>✅</span>
          {importMessage}
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
              color: tab === t.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: tab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              background: tab === t.id ? 'rgba(79,152,163,0.08)' : 'transparent',
              fontWeight: tab === t.id ? 600 : 400,
            }}
          >{t.label}</button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 p-6 overflow-auto">
        {tab === 'overview'  && <OverviewTab records={records} />}
        {tab === 'trends'    && <TrendsTab records={records} />}
        {tab === 'progress'  && <ProgressTab records={records} />}
        {tab === 'insights'  && <InsightsTab records={records} />}
        {tab === 'snapshot'  && <SnapshotTab records={records} />}
      </main>
    </div>
  )
}
