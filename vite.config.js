import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { getSecurityHeaders, getViteCorsConfig } from './vite.security.mjs'

const securityHeaders = getSecurityHeaders()
const corsConfig = getViteCorsConfig({ defaultPorts: [3002, 5173, 3000] })

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: '/',
  // Elimina console.log/debug/info en producción (conserva warn/error para diagnóstico).
  // Reemplaza el antiguo `drop` de esbuild, no disponible con el toolchain oxc de Vite 8.
  define: mode === 'production'
    ? {
        'console.log': '(()=>{})',
        'console.debug': '(()=>{})',
        'console.info': '(()=>{})',
      }
    : {},
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'oxc',
    rollupOptions: {
      output: {
        // Code-splitting con la API de rolldown (Vite 8): separa dependencias
        // grandes en chunks propios para aligerar la carga inicial.
        advancedChunks: {
          groups: [
            { name: 'vendor', test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'charts', test: /[\\/]node_modules[\\/]recharts[\\/]/ },
            { name: 'motion', test: /[\\/]node_modules[\\/]framer-motion[\\/]/ },
            { name: 'exceljs', test: /[\\/]node_modules[\\/]exceljs[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    port: 3002,
    host: true,
    strictPort: false,
    headers: securityHeaders,
    cors: corsConfig,
  },
  preview: {
    port: 3002,
    host: true,
    headers: securityHeaders,
    cors: corsConfig,
  },
}))



