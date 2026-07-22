import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// If the repo is served at https://<user>.github.io/<repo>/ the base must be
// set to the repo name so asset paths resolve correctly.
// Change 'body-evolution-analyst' if you rename the repo.
export default defineConfig({
  plugins: [react()],
  base: '/body-evolution-analyst/',
})
