import type { BodyRecord } from '../types/metrics'

export function generateDemoData(): BodyRecord[] {
  const records: BodyRecord[] = []
  const start = new Date('2024-01-15')
  let weight = 88.4
  let bodyFat = 24.8
  let muscleMass = 62.1
  let bodyWater = 55.2
  let boneMass = 3.42
  let bmr = 1920
  let visceralFat = 12

  for (let i = 0; i < 180; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i * 2)

    const progress = i / 180
    weight     += (Math.random() - 0.52) * 0.25
    bodyFat    += (Math.random() - 0.54) * 0.12
    muscleMass += (Math.random() - 0.46) * 0.08
    bodyWater  += (Math.random() - 0.48) * 0.1
    boneMass   += (Math.random() - 0.49) * 0.01
    bmr        += (Math.random() - 0.47) * 5
    if (i % 20 === 0 && visceralFat > 8) visceralFat -= 1

    if (i % 3 !== 0) continue // simulate skipped days

    records.push({
      date: new Date(date),
      weight:      +Math.max(70, weight - progress * 4).toFixed(1),
      bodyFat:     +Math.max(10, bodyFat - progress * 3.5).toFixed(1),
      muscleMass:  +Math.min(70, muscleMass + progress * 1.5).toFixed(1),
      bmi:         +((weight - progress * 4) / (1.78 ** 2)).toFixed(1),
      visceralFat: Math.max(6, visceralFat),
      bodyWater:   +Math.min(65, bodyWater + progress * 1.2).toFixed(1),
      boneMass:    +boneMass.toFixed(2),
      bmr:         +Math.round(bmr + progress * 40),
    })
  }

  return records.sort((a, b) => a.date.getTime() - b.date.getTime())
}
