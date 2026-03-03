const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const path = require('path');

module.exports = defineConfig({
  base: '/react/',
  root: path.resolve(__dirname, 'ui'),
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'public', 'react'),
    emptyOutDir: true
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:5000',
      '/css': 'http://localhost:5000',
      '/images': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true
      }
    }
  }
});
