export interface BodyRecord {
  date:               Date
  // Scale metrics
  weight?:            number   // kg
  bodyFat?:           number   // %
  bodyFatMass?:       number   // kg
  muscleMass?:        number   // kg
  muscleMassPct?:     number   // %
  skeletalMuscleMass?: number  // kg
  leanBodyMass?:      number   // kg
  bmi?:               number
  visceralFat?:       number   // level
  bodyWater?:         number   // %
  boneMass?:          number   // kg
  boneMassPct?:       number   // %
  bmr?:               number   // kcal
  heartRate?:         number   // bpm
  proteinPct?:        number   // %
  subcutaneousFatPct?: number  // %
  bodyAge?:           number
  bodyType?:          string
  headSize?:          number   // cm
  // Circumference measurements (File 1)
  bicepsCm?:          number
  chestCm?:           number
  waistCm?:           number
  hipCm?:             number
  thighCm?:           number
  waistHipRatio?:     number
  // Meta
  familyMember?:      string
  [key: string]: unknown
}

export type MetricKey = keyof Omit<BodyRecord, 'date' | 'bodyType' | 'familyMember'>

export interface MetricDefinition {
  key:            MetricKey
  label:          string
  unit:           string
  lowerIsBetter:  boolean
  color:          string
  precision:      number
  group:          'composition' | 'measurements' | 'vitals'
}

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  // Body composition
  { key: 'weight',            label: 'Weight',              unit: 'kg',   lowerIsBetter: true,  color: '#4f98a3', precision: 1, group: 'composition' },
  { key: 'bodyFat',           label: 'Body Fat',            unit: '%',    lowerIsBetter: true,  color: '#d163a7', precision: 1, group: 'composition' },
  { key: 'bodyFatMass',       label: 'Fat Mass',            unit: 'kg',   lowerIsBetter: true,  color: '#dd6974', precision: 1, group: 'composition' },
  { key: 'muscleMass',        label: 'Muscle Mass',         unit: 'kg',   lowerIsBetter: false, color: '#6daa45', precision: 1, group: 'composition' },
  { key: 'muscleMassPct',     label: 'Muscle %',            unit: '%',    lowerIsBetter: false, color: '#4dbb55', precision: 1, group: 'composition' },
  { key: 'skeletalMuscleMass',label: 'Skeletal Muscle',     unit: 'kg',   lowerIsBetter: false, color: '#5dcc65', precision: 1, group: 'composition' },
  { key: 'leanBodyMass',      label: 'Lean Body Mass',      unit: 'kg',   lowerIsBetter: false, color: '#7daa55', precision: 1, group: 'composition' },
  { key: 'bmi',               label: 'BMI',                 unit: '',     lowerIsBetter: true,  color: '#e8af34', precision: 1, group: 'composition' },
  { key: 'visceralFat',       label: 'Visceral Fat',        unit: 'lvl',  lowerIsBetter: true,  color: '#fdab43', precision: 0, group: 'composition' },
  { key: 'bodyWater',         label: 'Body Water',          unit: '%',    lowerIsBetter: false, color: '#5591c7', precision: 1, group: 'composition' },
  { key: 'boneMass',          label: 'Bone Mass',           unit: 'kg',   lowerIsBetter: false, color: '#a86fdf', precision: 2, group: 'composition' },
  { key: 'boneMassPct',       label: 'Bone Mass %',         unit: '%',    lowerIsBetter: false, color: '#c08fef', precision: 1, group: 'composition' },
  { key: 'bmr',               label: 'BMR',                 unit: 'kcal', lowerIsBetter: false, color: '#fdab43', precision: 0, group: 'vitals' },
  { key: 'heartRate',         label: 'Heart Rate',          unit: 'bpm',  lowerIsBetter: true,  color: '#dd6974', precision: 0, group: 'vitals' },
  { key: 'proteinPct',        label: 'Protein %',           unit: '%',    lowerIsBetter: false, color: '#e8d034', precision: 1, group: 'composition' },
  { key: 'subcutaneousFatPct',label: 'Subcutaneous Fat',    unit: '%',    lowerIsBetter: true,  color: '#c163a7', precision: 1, group: 'composition' },
  { key: 'bodyAge',           label: 'Body Age',            unit: 'yrs',  lowerIsBetter: true,  color: '#8892a4', precision: 0, group: 'vitals' },
  // Circumferences
  { key: 'bicepsCm',          label: 'Biceps',              unit: 'cm',   lowerIsBetter: false, color: '#6daa45', precision: 1, group: 'measurements' },
  { key: 'chestCm',           label: 'Chest',               unit: 'cm',   lowerIsBetter: false, color: '#5591c7', precision: 1, group: 'measurements' },
  { key: 'waistCm',           label: 'Waist',               unit: 'cm',   lowerIsBetter: true,  color: '#d163a7', precision: 1, group: 'measurements' },
  { key: 'hipCm',             label: 'Hip',                 unit: 'cm',   lowerIsBetter: false, color: '#a86fdf', precision: 1, group: 'measurements' },
  { key: 'thighCm',           label: 'Thighs',              unit: 'cm',   lowerIsBetter: false, color: '#4f98a3', precision: 1, group: 'measurements' },
  { key: 'waistHipRatio',     label: 'Waist/Hip Ratio',     unit: '',     lowerIsBetter: true,  color: '#e8af34', precision: 2, group: 'measurements' },
  { key: 'headSize',          label: 'Head Size',           unit: 'cm',   lowerIsBetter: false, color: '#8892a4', precision: 1, group: 'measurements' },
]

export interface Insight {
  id:         string
  type:       'positive' | 'neutral' | 'concern'
  title:      string
  body:       string
  metrics:    MetricKey[]
  period:     string
  confidence: 'high' | 'medium' | 'low'
}

export interface MetricStats {
  key:        MetricKey
  baseline:   number
  latest:     number
  absChange:  number
  pctChange:  number
  min:        number
  max:        number
  avg:        number
  slope:      number
  volatility: number
  streak:     number
  improved:   boolean
}
