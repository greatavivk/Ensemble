import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// If plugin-react isn't installed, remove it and this import,
// but it's nice to have for JSX fast refresh locally.
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist' }
})
