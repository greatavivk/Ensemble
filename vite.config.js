import { defineConfig } from 'vite'


// If plugin-react isn't installed, remove it and this import,
// but it's nice to have for JSX fast refresh locally.
export default defineConfig({

  build: { outDir: 'dist' }
})
