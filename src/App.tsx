import React, { useState, useEffect, useCallback } from 'react'
import { ImportScreen } from './components/ImportScreen'
import { Dashboard } from './components/Dashboard'
import { generateDemoData } from './data/demoData'
import { loadRecords, saveRecords, clearRecords, mergeRecords } from './data/storage'
import type { BodyRecord } from './types/metrics'

export default function App() {
  // allRecords: every row from every member, as imported
  const [allRecords, setAllRecords] = useState<BodyRecord[]>([])
  // all distinct member names found in the data
  const [members, setMembers] = useState<string[]>([])
  // the currently viewed member
  const [activeMember, setActiveMember] = useState<string>('')
  const [loaded, setLoaded] = useState(false)

  // On mount: restore persisted records
  useEffect(() => {
    const saved = loadRecords()
    if (saved.length > 0) {
      bootstrapFromRecords(saved)
      setLoaded(true)
    }
  }, [])

  /** Derive members list + pick default active member (most records) */
  function bootstrapFromRecords(recs: BodyRecord[]) {
    setAllRecords(recs)
    const counts: Record<string, number> = {}
    recs.forEach(r => {
      const m = r.familyMember ?? '__unknown__'
      counts[m] = (counts[m] ?? 0) + 1
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([m]) => m)
    setMembers(sorted)
    setActiveMember(prev => (prev && sorted.includes(prev) ? prev : sorted[0] ?? ''))
  }

  /** Records visible in the dashboard = filtered to active member */
  const visibleRecords = activeMember
    ? allRecords.filter(r => (r.familyMember ?? '__unknown__') === activeMember)
    : allRecords

  const handleData = useCallback((incoming: BodyRecord[]) => {
    const merged = mergeRecords(allRecords, incoming)
    saveRecords(merged)
    bootstrapFromRecords(merged)
    setLoaded(true)
  }, [allRecords])

  const handleDemo = useCallback(() => {
    const data = generateDemoData()
    const merged = mergeRecords(allRecords, data)
    saveRecords(merged)
    bootstrapFromRecords(merged)
    setLoaded(true)
  }, [allRecords])

  const handleReset = useCallback(() => {
    setAllRecords([])
    setMembers([])
    setActiveMember('')
    setLoaded(false)
  }, [])

  const handleClearData = useCallback(() => {
    clearRecords()
    setAllRecords([])
    setMembers([])
    setActiveMember('')
    setLoaded(false)
  }, [])

  if (!loaded) {
    return (
      <ImportScreen
        onData={handleData}
        onDemo={handleDemo}
        existingRecordsCount={allRecords.length}
      />
    )
  }

  return (
    <Dashboard
      records={visibleRecords}
      allRecords={allRecords}
      members={members}
      activeMember={activeMember}
      onMemberChange={setActiveMember}
      onReset={handleReset}
      onClearData={handleClearData}
      onImportMore={handleData}
    />
  )
}
