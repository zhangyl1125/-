import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { codecovVitePlugin } from '@codecov/vite-plugin'

export default defineConfig({
  // SockJS's source entry assumes Node's `global`; its browser bundle scopes it safely.
  resolve: {
    alias: [{ find: /^sockjs-client$/, replacement: 'sockjs-client/dist/sockjs.js' }],
  },
  plugins: [
    react(),
    codecovVitePlugin({
      enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
      bundleName: 'hackhub-app',
      uploadToken: process.env.CODECOV_TOKEN,
    }),
  ],
})
