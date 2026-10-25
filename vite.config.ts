import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dev-only-refresh-csp',
      transformIndexHtml(html, context) {
        return context.server
          ? html.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
          : html;
      },
    },
  ],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: ['**/release/**', '**/test-results/**'] },
  },
});
