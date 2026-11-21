import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const { CHAT_API_TARGET } = loadEnv(mode, process.cwd(), 'CHAT_API_');

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': CHAT_API_TARGET || 'http://localhost:3000',
      },
    },
  };
});
