import { defineConfig } from 'vite'
import { resolve } from 'path'

// Plugin to handle clean URLs
function cleanUrlsPlugin() {
  return {
    name: 'clean-urls',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Map clean URLs to .html files
        const urlMap = {
          '/': '/index.html',
          '/how-to-get-here': '/how-to-get-here.html',
          '/instructions': '/instructions.html',
          '/trips': '/trips.html',
          '/map': '/map.html',
          '/gallery': '/gallery.html',
          '/login': '/login.html'
        }

        if (urlMap[req.url]) {
          req.url = urlMap[req.url]
        }

        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [cleanUrlsPlugin()],
  server: {
    host: true,
    port: 5173,
    middlewareMode: false,
    proxy: {
      // Proxy /uploads requests to backend in development
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      // Proxy /api requests to backend
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        'main': resolve(__dirname, 'index.html'),
        'gallery': resolve(__dirname, 'gallery.html'),
        'instructions': resolve(__dirname, 'instructions.html'),
        'how-to-get-here': resolve(__dirname, 'how-to-get-here.html'),
        'trips': resolve(__dirname, 'trips.html'),
        'map': resolve(__dirname, 'map.html'),
        'login': resolve(__dirname, 'login.html')
      }
    }
  },
  appType: 'mpa'
})
