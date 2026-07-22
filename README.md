# Body Evolution Analyst

A **local-first** web app that imports your [EufyLife](https://support.nz.eufy.com/support/solutions/articles/154000242608-how-to-export-data-from-the-eufylife-app-) CSV exports and analyzes how your body has evolved over time — with AI-powered insights, interactive charts, and an evolution snapshot report.

> 🔒 **Privacy-first**: All analysis runs entirely in the browser. No data is ever uploaded to any server.

---

## Features

- 📥 **Drag-and-drop CSV import** — supports EufyLife CSV export format, schema auto-detection, column mapping, and validation
- 📊 **Overview dashboard** — current snapshot, net change since start, 30/90-day deltas, improvement streaks
- 📈 **Trend analysis** — interactive time-series charts, moving averages, rolling deltas, inflection annotations
- 💡 **AI insight engine** — structured explainable insights (recomposition signals, plateau detection, trend slope changes)
- 🤖 **AI coach mode** — ask questions about your data in plain language
- 🔁 **Correlation explorer** — weight vs body fat, muscle vs fat, volatility vs consistency
- 📋 **Evolution snapshot report** — downloadable summary with "Where I started", "Where I am now", etc.
- 🗓️ **Consistency heatmap** — calendar view of measurement frequency
- 🧪 **Demo mode** — synthetic data included to explore the UI without real data

---

## Metrics Supported

| Metric | Direction |
|---|---|
| Weight | Lower (context-dependent) |
| Body Fat % | Lower is better |
| Muscle Mass | Higher is better |
| BMI | Lower (context-dependent) |
| Visceral Fat | Lower is better |
| Body Water % | Higher is better |
| Bone Mass | Stable/higher is better |
| BMR (Basal Metabolic Rate) | Context-dependent |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
git clone https://github.com/switcheaeu-pixel/body-evolution-analyst.git
cd body-evolution-analyst
npm install
```

### Run (development)

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Build (production)

```bash
npm run build
npm run preview
```

---

## Exporting Data from EufyLife

1. Open the **EufyLife** app on your phone
2. Go to **Me → Data → Export All Data**
3. Enter your account password for verification
4. Enter your email address
5. Receive the CSV file by email
6. Drag-and-drop the CSV file into Body Evolution Analyst

See the [EufyLife export guide](https://support.nz.eufy.com/support/solutions/articles/154000242608-how-to-export-data-from-the-eufylife-app-) for details.

---

## Project Structure

```
body-evolution-analyst/
├── src/
│   ├── data/               # Ingestion, parsing, normalization
│   │   ├── parser.ts
│   │   ├── normalizer.ts
│   │   └── sampleData.ts
│   ├── analytics/          # Analytics engine
│   │   ├── statistics.ts
│   │   ├── trends.ts
│   │   ├── insights.ts
│   │   ├── recomposition.ts
│   │   └── outliers.ts
│   ├── ai/                 # AI coach / Q&A layer
│   │   └── coach.ts
│   ├── components/         # React UI components
│   │   ├── Dashboard/
│   │   ├── TrendCharts/
│   │   ├── InsightsPanel/
│   │   ├── CorrelationExplorer/
│   │   ├── EvolutionSnapshot/
│   │   ├── DataQuality/
│   │   ├── AICoach/
│   │   └── ImportWizard/
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts
│   ├── hooks/              # Custom React hooks
│   │   └── useBodyData.ts
│   ├── store/              # State management
│   │   └── useStore.ts
│   ├── utils/              # Shared utility functions
│   │   └── format.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── data/
│   └── sample-eufy-export.csv
├── public/
│   └── favicon.svg
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Demo Mode

Click **Load Sample Data** on the import screen to explore the full UI with 12 months of synthetic body-composition measurements without needing your real data.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Charts | Recharts 2 |
| State | Zustand |
| Styling | Tailwind CSS v3 |
| CSV Parsing | PapaParse |
| Export | html2canvas + jsPDF |

---

## Important Notes

- All insights are **data-driven interpretations**, not medical or clinical advice.
- Consult a healthcare professional for any health-related decisions.
- Calculations are transparent and inspectable in the Data Quality panel.

---

## License

MIT
