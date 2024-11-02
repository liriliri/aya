import isWindows from 'licia/isWindows.js'
import isMac from 'licia/isMac.js'
import normalizePath from 'licia/normalizePath.js'
import path from 'path'

const adbDir = resolve(__dirname, '../adb')

await fs.ensureDir(adbDir)

if (isWindows) {
  const platformToolsPath = resolve(adbDir, 'platform-tools-latest-windows.zip')
  const platformToolsDir = resolve(adbDir, 'platform-tools')
  const downloadUrl =
    'https://dl.google.com/android/repository/platform-tools-latest-windows.zip'
  await $`curl -Lk ${downloadUrl} > ${platformToolsPath}`
  await $`unzip -o ${platformToolsPath} -d ${adbDir}`
  await fs.remove(platformToolsPath)

  const files = ['adb.exe']
  for (const file of files) {
    await fs.copy(resolve(platformToolsDir, file), resolve(adbDir, file))
  }

  await fs.remove(platformToolsDir)
} else if (isMac) {
  // TODO
}

function resolve(...args) {
  return normalizePath(path.resolve(...args))
}
