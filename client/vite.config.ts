import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: parseInt(process.env.FRONT_PORT || '5173'),
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.SERVER_PORT || process.env.PORT || '3001'}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 4500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('monaco-editor')) return 'monaco-editor'
          if (id.includes('d3')) return 'vendor-d3'
        },
      },
    },
  },
  optimizeDeps: {
    include: ['monaco-editor'],
  },
})
