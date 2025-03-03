import { defineConfig } from 'vite'
import { resolve } from 'path'
import { builtinModules } from 'node:module'

const builtins = builtinModules.filter((e) => !e.startsWith('_'))
builtins.push('electron', ...builtins.map((m) => `node:${m}`))

export default defineConfig({
  build: {
    outDir: 'dist/main',
    lib: {
      entry: resolve(__dirname, 'src/main/index.ts'),
      name: 'Main',
      fileName: 'index',
      formats: ['cjs'],
    },
    rollupOptions: {
      external: builtins,
    },
  },
  resolve: {
    mainFields: ['main', 'module'],
    alias: {
      share: resolve(__dirname, 'src/share'),
    },
  },
})
