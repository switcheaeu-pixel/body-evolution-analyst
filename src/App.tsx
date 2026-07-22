import React, { useState, useEffect, useCallback } from 'react'
import { ImportScreen } from './components/ImportScreen'
import { Dashboard } from './components/Dashboard'
import { generateDemoData } from './data/demoData'
import { loadRecords, saveRecords, clearRecords, mergeRecords, getMergeDiff } from './data/storage'
import type { BodyRecord } from './types/metrics'

export default function App() {
  const [records, setRecords] = useState<BodyRecord[]>([])
  const [loaded, setLoaded] = useState(false)
  const [existingCount, setExistingCount] = useState(0)

  useEffect(() => {
    const saved = loadRecords()
    if (saved.length > 0) {
      setRecords(saved)
      setLoaded(true)
      setExistingCount(saved.length)
    }
  }, [])

  const handleData = useCallback((data: BodyRecord[]) => {
    if (records.length > 0) {
      const { added, updated } = getMergeDiff(records, data)
      const merged = mergeRecords(records, data)
      setRecords(merged)
      saveRecords(merged)
      setLoaded(true)
      // Show merge result briefly — handled in ImportScreen
    } else {
      setRecords(data)
      saveRecords(data)
      setLoaded(true)
    }
  }, [records])

  const handleDemo = useCallback(() => {
    const data = generateDemoData()
    if (records.length > 0) {
      const merged = mergeRecords(records, data)
      setRecords(merged)
      saveRecords(merged)
    } else {
      setRecords(data)
      saveRecords(data)
    }
    setLoaded(true)
  }, [records])

  const handleReset = useCallback(() => {
    setRecords([])
    setLoaded(false)
  }, [])

  const handleClearData = useCallback(() => {
    clearRecords()
    setRecords([])
    setLoaded(false)
  }, [])

  if (!loaded) {
    return (
      <ImportScreen
        onData={handleData}
        onDemo={handleDemo}
        existingRecordsCount={records.length}
      />
    )
  }

  return (
    <Dashboard
      records={records}
      onReset={handleReset}
      onClearData={handleClearData}
      onImportMore={(data: BodyRecord[]) => handleData(data)}
    />
  )
}
