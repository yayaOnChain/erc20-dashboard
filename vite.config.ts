import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    define: {
      'process.env.VITE_CONTRACT_ADDRESS': JSON.stringify(env.VITE_CONTRACT_ADDRESS || ''),
      'process.env.VITE_CONTRACT_CHAIN_ID': JSON.stringify(env.VITE_CONTRACT_CHAIN_ID || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      css: true,
      include: ['src/test/frontend/**/*'],
      exclude: ['**/node_modules/**', '**/token.test.ts'],
    },
  }
})
