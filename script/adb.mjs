import isWindows from 'licia/isWindows.js'
import normalizePath from 'licia/normalizePath.js'
import path from 'path'

const adbDir = resolve(__dirname, '../adb')

await fs.ensureDir(adbDir)

const platformToolsPath = resolve(
  adbDir,
  `platform-tools-latest-${isWindows ? 'windows' : 'darwin'}.zip`
)
const platformToolsDir = resolve(adbDir, 'platform-tools')
const downloadUrl = `https://dl.google.com/android/repository/platform-tools-latest-${
  isWindows ? 'windows' : 'darwin'
}.zip`
await $`curl -Lk ${downloadUrl} > ${platformToolsPath}`
await $`unzip -o ${platformToolsPath} -d ${adbDir}`
await fs.remove(platformToolsPath)

const file = isWindows ? 'adb.exe' : 'adb'
await fs.copy(resolve(platformToolsDir, file), resolve(adbDir, file))

await fs.remove(platformToolsDir)

function resolve(...args) {
  return normalizePath(path.resolve(...args))
}
