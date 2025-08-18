import isWindows from 'licia/isWindows.js'
import isMac from 'licia/isMac.js'
import normalizePath from 'licia/normalizePath.js'
import path from 'path'

const adbDir = resolve(__dirname, '../resources/adb')

await fs.ensureDir(adbDir)

const platformToolsPath = resolve(
  adbDir,
  `platform-tools-latest-${isWindows ? 'windows' : 'darwin'}.zip`
)
const platformToolsDir = resolve(adbDir, 'platform-tools')
const downloadUrl = `https://dl.google.com/android/repository/platform-tools-latest-${
  isWindows ? 'windows' : isMac ? 'darwin' : 'linux'
}.zip`
await $`curl -Lk ${downloadUrl} > ${platformToolsPath}`
await $`unzip -o ${platformToolsPath} -d ${adbDir}`
await fs.remove(platformToolsPath)

let files = ['adb']
if (isWindows) {
  files = ['adb.exe', 'AdbWinApi.dll', 'AdbWinUsbApi.dll']
}
for (let i = 0, len = files.length; i < len; i++) {
  const file = files[i]
  await fs.copy(resolve(platformToolsDir, file), resolve(adbDir, file))
}

await fs.remove(platformToolsDir)

function resolve(...args) {
  return normalizePath(path.resolve(...args))
}
