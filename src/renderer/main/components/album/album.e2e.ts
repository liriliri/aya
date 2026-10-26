/**
 * 真机端到端扫描测试:
 *   npx esbuild --bundle tmp/albumE2E.ts --platform=node --format=cjs \
 *     --outfile=tmp/albumE2E.cjs --log-level=error && node tmp/albumE2E.cjs
 *
 * 用 adb shell ls 模拟渲染进程的 main.readDir(返回 IFile[] 结构),
 * 其余逻辑(并发遍历、排除规则、增量缓存、相册判定)全部走插件真实代码。
 */
import { execFile } from 'child_process'
import { scanDevice } from './scanner'

const ADB = 'D:/program/aya/resources/adb/adb.exe'

function exec(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout) => {
      if (err) {
        reject(err)
      } else {
        resolve(stdout as string)
      }
    })
  })
}

const regLs =
  /^([drwxsStT-]+)\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}(?::\d+)?)\s+(.+)$/

async function adbReadDir(_deviceId: string, path: string) {
  let out: string
  try {
    out = await exec(ADB, ['shell', 'ls', '-la', path])
  } catch (err: any) {
    console.error(`readDir 失败 ${path}: ${err.message}`)
    throw err
  }
  const files: any[] = []
  for (const rawLine of out.split(/\r?\n/)) {
    const line = rawLine.trimEnd()
    const m = line.match(regLs)
    if (!m) {
      continue
    }
    const name = m[5].trim()
    if (name === '.' || name === '..' || name === 'total') {
      continue
    }
    files.push({
      name,
      directory: m[1][0] === 'd',
      mtime: new Date(`${m[3]}T${m[4]}`),
      mode: m[1],
      size: parseInt(m[2], 10),
    })
  }
  return files
}

async function main() {
  ;(globalThis as any).main = { readDir: adbReadDir }

  // 清理上次运行可能残留的状态(上次输出被截断时清理步骤未执行)
  await exec(ADB, ['shell', 'rm', '-rf', '/sdcard/AyaAlbumTest/newalbum'])

  const base = {
    deviceId: 'test',
    root: '/sdcard/AyaAlbumTest',
    threshold: 5,
    excludedNames: ['Android'],
    excludeHidden: true,
    respectNoMedia: true,
    concurrency: 4,
  }

  console.log('== 第一次扫描(全量)==')
  const first = await scanDevice({ ...base, cache: {}, readDir: adbReadDir })
  for (const album of first.albums) {
    console.log(`相册: ${album.path} (${album.count} 张, own=${album.ownCount})`)
  }
  console.log(
    `统计: 读取 ${first.stats.readDirs}, 复用 ${first.stats.reusedDirs}, 图片 ${first.stats.images}`
  )

  let failed = 0
  function expect(cond: boolean, msg: string) {
    if (cond) {
      console.log(`PASS: ${msg}`)
    } else {
      failed++
      console.error(`FAIL: ${msg}`)
    }
  }

  const paths = first.albums.map((a) => a.path)
  expect(paths.length === 2, `发现 2 个相册(实际 ${paths.length}: ${paths.join(', ')})`)
  expect(paths.includes('/sdcard/AyaAlbumTest/album1'), 'album1(6 张直接成册)被发现')
  expect(paths.includes('/sdcard/AyaAlbumTest/album2'), 'album2(3+3 子目录拼成册)被发现')
  expect(!paths.includes('/sdcard/AyaAlbumTest/.hidden'), '.hidden 隐藏目录被排除')
  expect(!paths.includes('/sdcard/AyaAlbumTest/nomedia'), '.nomedia 目录被排除')
  expect(!paths.includes('/sdcard/AyaAlbumTest/few'), 'few(3 张)不足阈值不成册')
  expect(!paths.includes('/sdcard/AyaAlbumTest'), '根目录被成册子目录抑制')

  const album2 = first.albums.find((a) => a.path.endsWith('album2'))
  expect(!!album2 && album2.count === 6, 'album2 数量为 6(0+3+3)')
  expect(first.stats.images === 21, `图片总数 21(实际 ${first.stats.images},.hidden 整个目录被跳过故不计入)`)

  console.log('\n== 第二次扫描(增量)==')
  const second = await scanDevice({ ...base, cache: first.cache, readDir: adbReadDir })
  const secondPaths = second.albums.map((a) => a.path).sort()
  expect(
    JSON.stringify(secondPaths) === JSON.stringify(paths.slice().sort()),
    '增量扫描结果与全量一致'
  )
  expect(second.stats.readDirs === 1, `增量扫描仅重读根目录(实际读取 ${second.stats.readDirs})`)
  expect(second.stats.reusedDirs > 0, `增量扫描复用了缓存目录(${second.stats.reusedDirs} 个)`)

  console.log('\n== 新增子目录后的增量发现 ==')
  await exec(ADB, ['shell', 'mkdir', '-p', '/sdcard/AyaAlbumTest/newalbum'])
  const jpg = '/sdcard/AyaAlbumTest/album1/pic1.jpg'
  for (let i = 1; i <= 5; i++) {
    await exec(ADB, ['shell', 'cp', jpg, `/sdcard/AyaAlbumTest/newalbum/n${i}.jpg`])
  }
  const third = await scanDevice({ ...base, cache: second.cache, readDir: adbReadDir })
  const thirdPaths = third.albums.map((a) => a.path)
  expect(thirdPaths.includes('/sdcard/AyaAlbumTest/newalbum'), '新增 5 张图的目录被增量发现')

  // 清理新增目录,恢复现场供应用内人工复核
  await exec(ADB, ['shell', 'rm', '-rf', '/sdcard/AyaAlbumTest/newalbum'])

  console.log(`\n结果: ${failed === 0 ? '全部通过' : failed + ' 项失败'}`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
