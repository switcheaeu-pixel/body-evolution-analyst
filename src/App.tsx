import React, { useState } from 'react'
import { ImportScreen } from './components/ImportScreen'
import { Dashboard } from './components/Dashboard'
import { generateDemoData } from './data/demoData'
import type { BodyRecord } from './types/metrics'

export default function App() {
  const [records, setRecords] = useState<BodyRecord[]>([])
  const [loaded, setLoaded] = useState(false)

  const handleData = (data: BodyRecord[]) => {
    setRecords(data)
    setLoaded(true)
  }

  const handleDemo = () => {
    setRecords(generateDemoData())
    setLoaded(true)
  }

  const handleReset = () => {
    setRecords([])
    setLoaded(false)
  }

  if (!loaded) {
    return <ImportScreen onData={handleData} onDemo={handleDemo} />
  }

  return <Dashboard records={records} onReset={handleReset} />
}
