import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'ReactTextflux',
      fileName: (format) => `index.${format}.js`,
      formats: ['es', 'umd']
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime'
      ],
      output: {
        exports: 'named',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
          'react/jsx-dev-runtime': 'jsxDevRuntime'
        }
      }
    },
    outDir: 'dist',
    sourcemap: false
  }
});