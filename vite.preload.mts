import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { builtinModules } from 'node:module'
import { alias } from './vite.alias.mts'

const rootDir = dirname(fileURLToPath(import.meta.url))
const builtins = builtinModules.filter((moduleName) => !moduleName.startsWith('_'))
builtins.push('electron', ...builtins.map((moduleName) => `node:${moduleName}`))

export default defineConfig({
  build: {
    outDir: 'dist/preload',
    lib: {
      entry: resolve(rootDir, 'src/preload/index.ts'),
      name: 'Main',
      fileName: 'index',
      formats: ['cjs'],
    },
    rollupOptions: {
      external: builtins,
    },
  },
  resolve: {
    alias,
  },
})