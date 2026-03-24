import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    'process.env.VITE_CONTRACT_ADDRESS': JSON.stringify(process.env.VITE_CONTRACT_ADDRESS || ''),
    'process.env.VITE_CONTRACT_CHAIN_ID': JSON.stringify(process.env.VITE_CONTRACT_CHAIN_ID || ''),
  },
})
