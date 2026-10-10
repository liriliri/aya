import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs-extra'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { alias } from './vite.alias.mts'

export default defineConfig(async (): Promise<UserConfig> => {
  const rootDir = path.dirname(fileURLToPath(import.meta.url))
  const pkg = await fs.readJSON(path.resolve(rootDir, 'package.json'))
  return {
    base: '',
    plugins: [react()],
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: {
          app: './index.html',
        },
      },
    },
    css: {
      modules: {
        localsConvention: 'camelCaseOnly',
      },
    },
    server: {
      hmr: false,
      port: 8080,
    },
    define: {
      PRODUCT_NAME: JSON.stringify(pkg.productName),
      VERSION: JSON.stringify(pkg.version),
    },
    optimizeDeps: {
      exclude: ['@yume-chan/pcm-player'],
    },
    resolve: {
      alias: {
        ...alias,
        'licia/randomId': path.resolve(
          rootDir,
          'src/renderer/lib/liciaRandomId.ts'
        ),
      },
    },
  }
})