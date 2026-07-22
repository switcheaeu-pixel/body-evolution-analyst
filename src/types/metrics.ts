export interface BodyRecord {
  date: Date
  weight?: number        // kg
  bodyFat?: number       // %
  muscleMass?: number    // kg
  bmi?: number
  visceralFat?: number   // level
  bodyWater?: number     // %
  boneMass?: number      // kg
  bmr?: number           // kcal
  [key: string]: unknown
}

export type MetricKey = keyof Omit<BodyRecord, 'date'>

export interface MetricDefinition {
  key: MetricKey
  label: string
  unit: string
  lowerIsBetter: boolean
  color: string
  precision: number
}

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  { key: 'weight',      label: 'Weight',       unit: 'kg',   lowerIsBetter: true,  color: '#4f98a3', precision: 1 },
  { key: 'bodyFat',     label: 'Body Fat',     unit: '%',    lowerIsBetter: true,  color: '#d163a7', precision: 1 },
  { key: 'muscleMass',  label: 'Muscle Mass',  unit: 'kg',   lowerIsBetter: false, color: '#6daa45', precision: 1 },
  { key: 'bmi',         label: 'BMI',          unit: '',     lowerIsBetter: true,  color: '#e8af34', precision: 1 },
  { key: 'visceralFat', label: 'Visceral Fat', unit: 'lvl',  lowerIsBetter: true,  color: '#dd6974', precision: 0 },
  { key: 'bodyWater',   label: 'Body Water',   unit: '%',    lowerIsBetter: false, color: '#5591c7', precision: 1 },
  { key: 'boneMass',    label: 'Bone Mass',    unit: 'kg',   lowerIsBetter: false, color: '#a86fdf', precision: 2 },
  { key: 'bmr',         label: 'BMR',          unit: 'kcal', lowerIsBetter: false, color: '#fdab43', precision: 0 },
]

export interface Insight {
  id: string
  type: 'positive' | 'neutral' | 'concern'
  title: string
  body: string
  metrics: MetricKey[]
  period: string
  confidence: 'high' | 'medium' | 'low'
}

export interface MetricStats {
  key: MetricKey
  baseline: number
  latest: number
  absChange: number
  pctChange: number
  min: number
  max: number
  avg: number
  slope: number
  volatility: number
  streak: number
  improved: boolean
}
