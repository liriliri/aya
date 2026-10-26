# AYA 相册插件

在 AYA 中浏览手机相册:自动发现「包含图片集」的文件夹(相册),并以缩略图网格浏览,支持大图查看与批量管理。支持**主空间**与**隐私空间**(vivo XSpace,需「AYA 隐私空间助手」)两个数据源。

本插件复用 AYA 已有的接口能力:主空间走 `readDir`/`getFileUrl`/`deleteFile`/`pullFile`/`pushFile`,隐私空间走 xspace 系列接口(`xspaceList`/`xspaceFileUrl`/`xspaceEdit`),不修改 AYA 既有功能代码;新增代码全部位于本目录。

## 功能

### 一、相册发现

- 扫描 `/sdcard`(可配置),某目录**自身 + 一层子目录**中的图片数量达到阈值(默认 5 张)即判定为相册
- 若父目录和子目录同时满足条件,只展示最深层(避免 DCIM 整个目录淹没真实相册)
- 图片扩展名:`jpg jpeg png gif webp bmp heic avif`
- 相册列表展示:相册名、完整路径、图片数量、封面(最新一张)、最近时间;可按数量或时间排序
- 默认排除:`Android` 目录、`lost+found`、以 `.` 开头的隐藏目录、含 `.nomedia` 标记的目录(均可配置)
- **增量扫描**:首次全量扫描后,目录元数据(子目录列表、修改时间、图片计数)缓存在本机;再次扫描时,修改时间未变的目录直接复用缓存,只重新读取有变动的目录,新增/删除的相册会被自动发现

### 二、相册内浏览

- 缩略图网格,三档尺寸切换:小(120px)/ 中(200px)/ 大(320px)
- 虚拟滚动:只渲染可视区域的单元格,万张级目录不卡顿
- 缩略图管线:经设备端 HTTP 服务拉取原图 → 前端按 EXIF 方向解码并降采样(默认最长边 480px,JPEG 质量 82%)→ 缓存到 IndexedDB(按 `设备|路径|修改时间` 为键,文件变动自动失效)→ 读取失败(如 HEIC 无法解码)降级为占位图
- 点击查看原图(支持缩放),可按文件名或修改时间排序、升/降序切换

### 三、批量选择与处理

| 操作 | 方式 |
| --- | --- |
| 选中单个 | 单击图片(再次双击可查看原图) |
| 不连续多选 | Ctrl + 单击(逐个增减) |
| 区间选择 | 先单击起点,再 Shift + 单击终点 |
| 全选 / 取消全选 | Ctrl + A,或工具栏按钮;Esc 取消选择 |
| 复制 | Ctrl + C,或工具栏「复制」(插件内部剪贴板,按设备绑定) |
| 粘贴 | 进入目标相册后 Ctrl + V,或工具栏「粘贴 N 张」;粘贴到当前相册根目录,重名自动改为 `名称 (2).jpg` |
| 删除 | Delete 键,或工具栏「删除」;弹确认框后执行 |

- 删除确认框会明确提示:**ADB 删除不进入手机相册的「最近删除」,不可恢复**;建议重要图片先「复制」到其他相册备份
- 复制/删除完成后自动触发一次增量重扫,相册列表的数量与封面即时更新
- 主空间粘贴实现:AYA 无设备端复制接口,采用「拉取到电脑临时目录 → 推回手机目标相册」的方式,aya 自带传输面板会显示进度;会在系统临时目录留下中转文件(命名 `aya-album-*`,由操作系统清理)
- **隐私空间粘贴为设备端直接复制**(助手 `/v1/edit` 的 `copy`),不经电脑中转,速度更快

### 四、隐私空间(vivo XSpace)

- 相册列表左上角可在「主空间 / 隐私空间」之间切换,两边的配置、扫描缓存、剪贴板相互独立
- 前提:手机上安装并运行「AYA 隐私空间助手」(即 aya「隐私空间」面板所依赖的同一个助手);未安装/未运行时切换会在列表顶部显示中文提示横幅(并跳过注定失败的自动扫描),不影响主空间功能
- 首次进入隐私空间时自动探测卷根目录(如 `/storage/emulated/666`)并作为扫描根,可在设置中修改
- 相册发现、浏览、缩略图、批量选择/删除/复制/粘贴能力与主空间完全一致;默认排除规则同样生效(`.vivoFileRecycleBin` 等隐藏目录会被排除)
- 助手中途离线时:扫描会在列表顶部显示错误横幅(不会静默返回「没有发现相册」);已打开的相册会显示读取错误而非一直「加载中…」
- 限制:剪贴板按数据源绑定,**不支持主空间 ↔ 隐私空间互贴**(两端文件系统隔离,助手 API 不提供跨空间写入)

## 安装

本插件已随本仓库代码集成。若在新版本 AYA 源码上重新套用,需修改 4 个 AYA 文件(共 5 行,与官方「隐私空间」功能的接入方式一致):

1. `src/renderer/main/components/toolbar/Tabs.tsx` — 面板数组中 `'file'` 之后加入 `'album'`
2. `src/renderer/main/App.tsx` — 顶部 `import Album from './components/album/Album'`,并在 `<Panel panel="file">` 块后加入:

   ```tsx
   <Panel panel="album">
     <Album />
   </Panel>
   ```

3. `src/common/langs/zh-CN.json` — 增加 `"album": "相册"`
4. `src/common/langs/en-US.json` — 增加 `"album": "Album"`(其他语言缺失时回退英文)

然后执行 `npm run build:main && npm run build:preload && npm run build:renderer`,用 `start.bat` 启动。

## 使用

1. USB 连接手机并授权调试,AYA 主界面顶部切换到「相册」标签
2. 首次打开自动开始全盘扫描(手机连接正常时,几十秒到几分钟,取决于目录数量);完成后显示相册列表
3. 点击「扫描 / 增量刷新」可重新扫描,通常几秒内完成
4. 点击相册卡片进入浏览;顶栏可切换尺寸、排序;单击选择、双击看原图;批量操作见上文「批量选择与处理」

## 配置项清单

设置入口:相册列表右上角「设置」。**主空间与隐私空间的配置各自独立**,按 `设备ID + 数据源` 保存在渲染进程 localStorage(`aya-album-config:{设备ID}:{main|xspace}`)。

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| 成册阈值 threshold | 5 | 目录+一层子目录图片数达到该值判定为相册 |
| 扫描根目录 scanRoot | /sdcard | 相册发现的起始目录 |
| 排除目录名 excludedNames | ["Android"] | 任意层级按名称排除 |
| 排除隐藏目录 excludeHidden | true | 排除 `.` 开头目录 |
| 遵循 .nomedia respectNoMedia | true | 含 `.nomedia` 的目录不成册、不向父目录计数、不向下遍历 |
| 扫描并发 concurrency | 8 | 同时列目录的数量,过大可能占满 USB 通道 |
| 缩略图最长边 thumbLongSide | 480 | 缓存缩略图的分辨率(修改后对新生成的缩略图生效) |

其他持久化数据:

- 扫描缓存:`aya-album-cache:{设备ID}:{main|xspace}`(localStorage;v1 旧键无后缀,主空间首次加载自动迁移)
- 缩略图缓存:IndexedDB `aya-album-thumbs`(主/隐私空间路径前缀不同,天然不冲突;可用浏览器开发者工具清除)

## 已知限制(AYA 接口所限,非实现缺陷)

1. **无原生缩略图接口**:AYA 只能通过设备端 HTTP 文件服务取原图,插件只能自行降采样。首次浏览一个相册时需下载原图,速度受 USB 带宽限制(实测约 40 MB/s,一批照片数秒内完成,之后走缓存)
2. **HEIC 无法显示缩略图**:Electron 30 / Chromium 不支持 HEIC 解码,此类图片显示占位图 `✕`(原图在手机上正常;AVIF 可正常显示)
3. **GIF 缩略图为首帧**(原图查看时正常播放)
4. **aya 无插件系统**:本插件以最小侵入方式集成,无法做到零改动(见「安装」)

## AYA 升级后的兼容风险

| 风险点 | 说明 | 缓解 |
| --- | --- | --- |
| 4 个接入文件的改动可能冲突 | 升级 AYA 源码后,`Tabs.tsx`/`App.tsx`/两个语言文件的接入行可能需要重新套用 | 接入行固定且极小(共 5 行),参照「安装」重打即可;插件目录本身不受影响 |
| `main.readDir` / `main.getFileUrl` IPC 变更 | 插件只依赖这两个既有接口和 `getDevices`;若上游改名/改签名需同步调整 `scanner.ts`/`Thumb.tsx` | 这两个接口自 AYA 早期版本即存在,稳定性高 |
| `xspaceList` / `xspaceFileUrl` / `xspaceEdit` 变更 | 隐私空间后端依赖这三个 IPC 与助手 HTTP 协议(`/v1/list` `/v1/raw` `/v1/edit`);助手与 `xspace.ts` 属同批开发,通常一起变更 | 所有 xspace 调用集中在 `backend.ts` 的 `xspaceBackend` 一处,改动范围可控 |
| IFile 返回结构变更 | 依赖 `name/directory/mtime/size` 字段 | `parseDirListing` 集中解析,只需改一处 |
| Electron/Chromium 升级 | `createImageBitmap(imageOrientation)`、IndexedDB、WebSocket 等均为稳定标准 API,风险低 | — |
| localStorage 容量 | 扫描缓存为纯 JSON(每目录约 100 字节,万级目录约 1MB),远低于配额 | 超限时自动放弃持久化,不影响本次使用 |

## 开发与测试

```bash
# 纯逻辑单测(相册判定、排除规则、解析,无需设备)
npx esbuild --bundle src/renderer/main/components/album/scanner.test.ts \
  --platform=node --format=cjs --outfile=tmp/albumTest.cjs && node tmp/albumTest.cjs

# 真机端到端测试(需连接手机,手机上有测试目录 /sdcard/AyaAlbumTest)
npx esbuild --bundle src/renderer/main/components/album/album.e2e.ts \
  --platform=node --format=cjs --outfile=tmp/albumE2E.cjs && node tmp/albumE2E.cjs

# 应用内验证(CDP):启动 AYA 时加 --remote-debugging-port=9229,然后
node src/renderer/main/components/album/verifyAlbum.cjs
node src/renderer/main/components/album/verifyBatch.cjs
node src/renderer/main/components/album/verifyXspace.cjs
```

CDP 验证脚本注意:页面里第一个 `button` 是应用工具栏按钮,定位按钮要按文字匹配,不能按序号。`verifyXspace.cjs` 覆盖隐私空间流程(数据源切换、根目录探测、扫描浏览、缩略图、选择、复制/粘贴/删除且自动清理测试数据);助手未安装/未运行时仅验证中文提示横幅并整体 SKIP,不算失败。

测试目录结构(验收用,可随时删除):`/sdcard/AyaAlbumTest/{album1(6 张)、album2/sub1+sub2(3+3)、few(3 张)、.hidden(6 张)、nomedia(6 张 + .nomedia)}`。删除命令:

```bash
adb shell rm -rf /sdcard/AyaAlbumTest
```

## 目录结构

```
album/
├── Album.tsx          面板入口:数据源切换、扫描调度、配置、列表/浏览切换、设置弹窗
├── AlbumList.tsx      相册列表(发现结果、主空间/隐私空间切换)
├── AlbumView.tsx      相册内缩略图网格(虚拟滚动、三档尺寸、批量选择/删除/复制粘贴、原图查看)
├── backend.ts         存储后端抽象:主空间(readDir 系)与隐私空间(xspace 系)双实现
├── Thumb.tsx          缩略图组件(降采样、EXIF 方向、IndexedDB 缓存、占位图)
├── scanner.ts         扫描与相册判定(并发遍历、排除规则、增量缓存,readDir 由后端注入)
├── thumbCache.ts      IndexedDB 缩略图缓存
├── config.ts          配置与扫描缓存的持久化(按设备+数据源隔离)
├── types.ts           类型定义
├── scanner.test.ts    纯逻辑单测(含 scanDevice 模拟 readDir 的异步用例)
├── album.e2e.ts       真机端到端测试(主空间)
├── verifyXspace.cjs   应用内 CDP 验证(隐私空间,助手缺失时 SKIP)
└── Album.module.scss  样式(跟随 AYA 主题变量)
```
