import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export const alias = {
  common: path.resolve(rootDir, 'src/common'),
  share: path.resolve(rootDir, 'src/share'),
}