import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createReadStream } from 'node:fs'
import {
  chmod,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { dump, load } from 'js-yaml'

const appimagetoolUrl =
  'https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage'

function run(command, args, { cwd = process.cwd(), env = {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} exited with ${signal ?? code}`))
      }
    })
  })
}

function basename(value) {
  const withoutQuery = decodeURIComponent(String(value).split(/[?#]/, 1)[0])
  return withoutQuery.slice(withoutQuery.lastIndexOf('/') + 1)
}

async function hashFile(filePath) {
  const hash = createHash('sha512')
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk)
  }
  return hash.digest('base64')
}

async function assertNoFuse2Dependency(filePath) {
  const runtimeHeader = await new Promise((resolve, reject) => {
    const chunks = []
    const stream = createReadStream(filePath, { start: 0, end: 1024 * 1024 })
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.once('error', reject)
    stream.once('end', () => resolve(Buffer.concat(chunks).toString('latin1')))
  })

  if (runtimeHeader.includes('libfuse.so.2')) {
    throw new Error('Rebuilt AppImage runtime still depends on libfuse.so.2')
  }
}

async function refreshUpdateMetadata(releaseDir, appImageName, sha512, size) {
  const yamlFiles = (await readdir(releaseDir)).filter(
    (file) => file.endsWith('.yml') || file.endsWith('.yaml'),
  )
  let metadataUpdated = false

  for (const file of yamlFiles) {
    const filePath = path.join(releaseDir, file)
    const metadata = load(await readFile(filePath, 'utf8'))
    if (!metadata || typeof metadata !== 'object') continue

    let changed = false
    if (Array.isArray(metadata.files)) {
      for (const entry of metadata.files) {
        if (!entry || typeof entry !== 'object') continue
        if (basename(entry.url) !== appImageName) continue
        entry.sha512 = sha512
        entry.size = size
        delete entry.blockMapSize
        changed = true
      }
    }

    if (basename(metadata.path) === appImageName) {
      metadata.sha512 = sha512
      metadata.size = size
      delete metadata.blockMapSize
      changed = true
    }

    if (changed) {
      await writeFile(filePath, dump(metadata))
      metadataUpdated = true
    }
  }

  if (!metadataUpdated) {
    throw new Error(`No update metadata referenced ${appImageName}`)
  }
}

const root = process.cwd()
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const releaseDir = path.join(root, 'release', pkg.version)
const appImages = (await readdir(releaseDir)).filter((file) =>
  file.endsWith('.AppImage'),
)

if (appImages.length !== 1) {
  throw new Error(`Expected one AppImage in ${releaseDir}, found ${appImages.length}`)
}

const appImageName = appImages[0]
const appImagePath = path.join(releaseDir, appImageName)
const temporaryDir = await mkdtemp(path.join(tmpdir(), 'aya-appimage-'))
const toolPath = path.join(temporaryDir, 'appimagetool.AppImage')
const outputPath = path.join(releaseDir, `${appImageName}.repacked.AppImage`)

try {
  const response = await fetch(appimagetoolUrl)
  if (!response.ok) {
    throw new Error(`Could not download appimagetool: ${response.status}`)
  }
  await writeFile(toolPath, Buffer.from(await response.arrayBuffer()))
  await chmod(toolPath, 0o755)

  await run(appImagePath, ['--appimage-extract'], {
    cwd: temporaryDir,
    env: { APPIMAGE_EXTRACT_AND_RUN: '1' },
  })

  await run(
    toolPath,
    ['--no-appstream', path.join(temporaryDir, 'squashfs-root'), outputPath],
    {
      env: {
        APPIMAGE_EXTRACT_AND_RUN: '1',
        ARCH: 'x86_64',
        VERSION: pkg.version,
      },
    },
  )

  await assertNoFuse2Dependency(outputPath)
  const { size } = await stat(outputPath)
  const sha512 = await hashFile(outputPath)
  await rename(outputPath, appImagePath)
  await refreshUpdateMetadata(releaseDir, appImageName, sha512, size)
} finally {
  await rm(temporaryDir, { recursive: true, force: true })
  await rm(outputPath, { force: true })
}