# Body Evolution Analyst

A local-first web app that imports your **EufyLife CSV export** and generates AI-powered insights on your body composition evolution over time.

## Features

- 📁 **CSV Import** — drag-and-drop EufyLife exports with schema auto-detection and column mapping
- 📊 **Overview Dashboard** — all metrics at a glance with net change since baseline
- 📈 **Trend Analysis** — interactive charts per metric with moving averages and period filters (30d / 90d / 6M / 1Y / All)
- 💡 **Insights Engine** — recomposition detection, momentum analysis, consistency scoring, and concern flags
- 📝 **Evolution Snapshot** — human-readable "how I'm evolving" report with exportable `.txt`
- 🧪 **Demo Mode** — synthetic data to test the app without your real data
- 🔒 **Privacy-first** — all analysis runs locally in the browser, no data sent anywhere

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Recharts (time-series charts)

## Getting Started

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## How to Export Your EufyLife Data

1. Open the EufyLife app
2. Go to **Me → Data → Export All Data**
3. Enter your password and submit your email
4. Download the CSV from the email
5. Drag it into the app

## Sample Data

A sample CSV is provided at `data/sample.csv` for testing.

## Metrics Supported

| Metric | Unit | Direction |
|--------|------|-----------|
| Weight | kg | Lower is better |
| Body Fat | % | Lower is better |
| Muscle Mass | kg | Higher is better |
| BMI | | Lower is better |
| Visceral Fat | level | Lower is better |
| Body Water | % | Higher is better |
| Bone Mass | kg | Higher is better |
| BMR | kcal | Higher is better |

## Disclaimer

This app provides data-driven informational analysis only. It is **not medical advice**. Consult a healthcare professional for clinical guidance.
