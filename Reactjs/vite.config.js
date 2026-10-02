import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/AgentCare_UI/',
  plugins: [react()],
  server: {
    port: Number(process.env.AGENTCARE_REACT_PORT || 3000),
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
  },
});
