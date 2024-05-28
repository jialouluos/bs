import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
function _resolve(dir: string) {
  return path.resolve(__dirname, dir);
}
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': _resolve('src'),


    },
  },

  build: {
    rollupOptions: {
      input: './index.html',
      external: [/.*public\/json\/.*.js$/, /.*threeWorker.js?raw$/],
    }
  },
  css: {
    devSourcemap: true
  }
});
