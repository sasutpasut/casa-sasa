import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    historyApiFallback: true
  },
  build: {
    rollupOptions: {
      input: {
        'main': resolve(__dirname, 'index.html'),
        'gallery': resolve(__dirname, 'gallery.html'),
        'instructions': resolve(__dirname, 'instructions.html'),
        'how-to-get-here': resolve(__dirname, 'how-to-get-here.html'),
        'tips-and-trips': resolve(__dirname, 'tips-and-trips.html')
      }
    }
  }
})
