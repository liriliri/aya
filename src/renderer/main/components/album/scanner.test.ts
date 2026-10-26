/**
 * 相册判定纯逻辑测试(不依赖设备):
 *   npx esbuild --bundle src/renderer/main/components/album/scanner.test.ts \
 *     --platform=node --format=cjs --outfile=tmp/albumTest.cjs && node tmp/albumTest.cjs
 */
import {
  baseName,
  computeAlbums,
  isDirExcluded,
  isImageName,
  joinPath,
  parseDirListing,
  scanDevice,
  toDirStat,
  uniqueName,
} from './scanner'
import { IDirStat, IImageItem } from './types'

let passed = 0
let failed = 0

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++
  } else {
    failed++
    console.error(`FAIL: ${msg}`)
  }
}

// ---- isImageName ----
assert(isImageName('a.jpg'), 'jpg 应识别')
assert(isImageName('a.JPG'), '扩展名大小写不敏感')
assert(isImageName('b.heic'), 'heic 应识别')
assert(isImageName('b.avif'), 'avif 应识别')
assert(isImageName('c.txt') === false, 'txt 不识别')
assert(isImageName('noext') === false, '无扩展名不识别')
assert(isImageName('.nomedia') === false, '.nomedia 不识别')

// ---- isDirExcluded ----
assert(isDirExcluded('Android', ['Android'], true), 'Android 默认排除')
assert(isDirExcluded('.thumbnails', [], true), '隐藏目录排除')
assert(isDirExcluded('.thumbnails', [], false) === false, '关闭隐藏排除后不再排除')
assert(isDirExcluded('DCIM', ['Android'], true) === false, '正常目录不排除')
assert(isDirExcluded('lost+found', [], true), 'lost+found 始终排除')

// ---- joinPath / baseName ----
assert(joinPath('/sdcard', 'a') === '/sdcard/a', 'joinPath 拼接')
assert(joinPath('/sdcard/', 'a') === '/sdcard/a', 'joinPath 去重斜杠')
assert(baseName('/sdcard/DCIM/旅行') === '旅行', 'baseName 取末段')

// ---- uniqueName ----
const existing = new Set(['a.jpg', 'a (2).jpg', 'b.png'])
assert(uniqueName('c.jpg', existing) === 'c.jpg', '不重名时保持原名')
assert(uniqueName('a.jpg', existing) === 'a (3).jpg', '重名时跳到下一个可用编号')
assert(uniqueName('b.png', existing) === 'b (2).png', 'b.png 重名自动编号')
assert(uniqueName('noext', existing) === 'noext', '无扩展名文件不重名保持原名')
const onlyOne = new Set(['x.jpg'])
assert(uniqueName('x.jpg', onlyOne) === 'x (2).jpg', '首个重名从 (2) 开始')

// ---- parseDirListing ----
const parsed = parseDirListing('/t', [
  { name: 'a.jpg', directory: false, mtime: new Date(1000), size: 1 },
  { name: 'b.mp4', directory: false, mtime: new Date(2000), size: 1 },
  { name: 'sub', directory: true, mtime: new Date(3000), size: 0 },
  { name: '.nomedia', directory: false, mtime: new Date(4000), size: 0 },
  { name: 'c.png', directory: false, mtime: new Date(5000), size: 1 },
] as any)
assert(parsed.images.length === 2, '图片数应为 2')
assert(parsed.subdirs.length === 1 && parsed.subdirs[0].mtime === 3000, '子目录带 mtime')
assert(parsed.noMedia, '.nomedia 标记识别')

// ---- computeAlbums(阈值 5) ----
const dirs: { [path: string]: IDirStat } = {}

function addDir(
  path: string,
  ownImages: number,
  subdirs: string[] = [],
  opts: { noMedia?: boolean; startMtime?: number } = {}
) {
  const start = opts.startMtime || 1000
  const images: IImageItem[] = []
  for (let i = 0; i < ownImages; i++) {
    images.push({ path: `${path}/img${i}.jpg`, name: `img${i}.jpg`, mtime: start + i, size: 1 })
  }
  const subdirStats = subdirs.map((name, idx) => ({ name, mtime: start + 100 + idx }))
  dirs[path] = toDirStat(0, images as any, subdirStats, !!opts.noMedia)
}

addDir('/sdcard', 0, ['A', 'B', 'C', 'D', 'E', 'F'])
addDir('/sdcard/A', 6) // 直接成册
addDir('/sdcard/B', 0, ['x', 'y']) // 子目录拼成册
addDir('/sdcard/B/x', 3)
addDir('/sdcard/B/y', 3, [], { startMtime: 2000 })
addDir('/sdcard/C', 2, ['z']) // 子目录单独成册,父目录应被抑制
addDir('/sdcard/C/z', 10, [], { startMtime: 9000 })
addDir('/sdcard/D', 3) // 不足阈值
addDir('/sdcard/E', 10, [], { noMedia: true }) // nomedia 排除
addDir('/sdcard/F', 1, ['g1', 'g2']) // 阈值边界:1+2+2=5 成册
addDir('/sdcard/F/g1', 2)
addDir('/sdcard/F/g2', 2)
addDir('/sdcard/G', 1, ['gN']) // nomedia 子目录不计入父目录:1+0 不足
addDir('/sdcard/G/gN', 4, [], { noMedia: true })

const albums = computeAlbums('/sdcard', dirs, 5)
const byPath: { [path: string]: any } = {}
for (const album of albums) {
  byPath[album.path] = album
}

assert(albums.length === 4, `应发现 4 个相册,实际 ${albums.length}: ${albums.map((a) => a.path).join(', ')}`)
assert(byPath['/sdcard/A'] && byPath['/sdcard/A'].count === 6, 'A 成册,数量 6')
assert(byPath['/sdcard/B'] && byPath['/sdcard/B'].count === 6, 'B 由子目录拼成册(0+3+3)')
assert(byPath['/sdcard/B/x'] === undefined, 'B/x 单独不足阈值,不成册')
assert(byPath['/sdcard/C'] === undefined, 'C 有成册子目录,被抑制')
assert(byPath['/sdcard/C/z'] && byPath['/sdcard/C/z'].count === 10, 'C/z 单独成册')
assert(byPath['/sdcard/D'] === undefined, 'D 不足阈值不成册')
assert(byPath['/sdcard/E'] === undefined, 'E 含 .nomedia 不成册')
assert(byPath['/sdcard/F'] && byPath['/sdcard/F'].count === 5, 'F 阈值边界 1+2+2=5 成册')
assert(byPath['/sdcard/G'] === undefined, 'nomedia 子目录图片不计入父目录,G 不足阈值')
assert(byPath['/sdcard'] === undefined, '根目录永不成册')
assert(
  byPath['/sdcard/B'] && byPath['/sdcard/B'].latest && byPath['/sdcard/B'].latest.path === '/sdcard/B/y/img2.jpg',
  '封面取自身+一层子目录中最新图片'
)
assert(
  byPath['/sdcard/C/z'] && byPath['/sdcard/C/z'].latest && byPath['/sdcard/C/z'].latest.mtime === 9009,
  '相册时间为最新图片 mtime'
)

console.log(`\n同步逻辑: ${passed} 通过, ${failed} 失败`)

// ---- scanDevice(异步,模拟 readDir,不依赖设备) ----
function fakeEntry(name: string, directory: boolean, mtime: number) {
  return { name, directory, mtime: new Date(mtime), size: directory ? 0 : 1 }
}

function imagesFor(path: string, count: number, startMtime: number) {
  const out: any[] = []
  for (let i = 0; i < count; i++) {
    out.push(fakeEntry(`img${i}.jpg`, false, startMtime + i))
  }
  return out
}

async function runScanTests() {
  // 场景一:根目录读取失败(如隐私空间助手未运行)应整体抛出原始错误,
  // 而不是静默返回 0 相册
  let rootError: any = null
  try {
    await scanDevice({
      deviceId: 'd',
      root: '/storage/emulated/666',
      threshold: 5,
      excludedNames: ['Android'],
      excludeHidden: true,
      respectNoMedia: true,
      concurrency: 2,
      cache: {},
      readDir: async () => {
        throw new Error('helper_offline')
      },
    })
  } catch (err: any) {
    rootError = err
  }
  assert(
    !!rootError && rootError.message.includes('helper_offline'),
    '根目录读取失败时应抛出原始错误(helper_offline)'
  )

  // 场景二:子目录读取失败被跳过,不影响其余相册发现
  const tree: { [path: string]: any[] } = {
    '/storage/emulated/666': [fakeEntry('A', true, 100), fakeEntry('B', true, 200)],
    '/storage/emulated/666/A': imagesFor('/storage/emulated/666/A', 6, 1000),
  }
  const result = await scanDevice({
    deviceId: 'd',
    root: '/storage/emulated/666',
    threshold: 5,
    excludedNames: ['Android'],
    excludeHidden: true,
    respectNoMedia: true,
    concurrency: 2,
    cache: {},
    readDir: async (deviceId: string, path: string) => {
      if (!tree[path]) {
        throw new Error('no such dir: ' + path)
      }
      return tree[path]
    },
  })
  assert(
    result.albums.length === 1 && result.albums[0].path === '/storage/emulated/666/A',
    '子目录 B 读取失败被跳过,仍发现相册 A'
  )

  // 场景三:目录 mtime 未变时第二次扫描复用缓存
  const result2 = await scanDevice({
    deviceId: 'd',
    root: '/storage/emulated/666',
    threshold: 5,
    excludedNames: ['Android'],
    excludeHidden: true,
    respectNoMedia: true,
    concurrency: 2,
    cache: result.cache,
    readDir: async (deviceId: string, path: string) => {
      if (!tree[path]) {
        throw new Error('no such dir: ' + path)
      }
      return tree[path]
    },
  })
  assert(result2.stats.reusedDirs > 0, '未变化的目录复用扫描缓存')
  assert(
    result2.albums.length === result.albums.length,
    '复用缓存的重扫结果与首次一致'
  )
}

runScanTests()
  .catch((err) => {
    failed++
    console.error('FAIL: scanDevice 测试异常:', err)
  })
  .finally(() => {
    console.log(`\n结果: ${passed} 通过, ${failed} 失败`)
    if (failed > 0) {
      process.exit(1)
    }
  })
