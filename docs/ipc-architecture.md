# AYA — IPC Architecture Reference

## Overview

AYA uses Electron's IPC system to bridge the **renderer process** (React UI) and the
**main process** (Node.js / ADB logic). Communication is strictly separated into two
mechanisms depending on who initiates the exchange.

### Two Transport Mechanisms

```
RENDERER ──── ipcRenderer.invoke(channel, ...args) ────► MAIN
              (request/response, returns Promise)

MAIN     ──── webContents.send(channel, ...args)   ────► RENDERER
              (fire-and-forget push, no return value)
```

### Abstraction Layers

```
Renderer                Preload (contextBridge)            Main
────────                ───────────────────────            ────
main.X(args)    ──►     invoke('X') wraps                  handleEvent('X', fn)
                        ipcRenderer.invoke('X', args)  ►   wraps ipcMain.handle('X', ...)

main.on('E', cb) ◄──    ipcRenderer.on('E', listener) ◄──  window.sendTo / sendAll
                        returns off() unsubscribe fn        wraps win.webContents.send
```

**`invoke(channel)`** — defined in `src/share/preload/util.ts`. Wraps
`ipcRenderer.invoke` and applies TypeScript generics from `common/types.ts` to give
end-to-end type safety without any runtime overhead.

**`handleEvent(channel, fn)`** — defined in `src/share/main/lib/util.ts`. Wraps
`ipcMain.handle` and adds debug logging for every call.

**`window.sendTo(name, channel, ...args)`** — defined in `src/share/main/lib/window.ts`.
Looks up a `BrowserWindow` by name and calls `webContents.send`.

**`window.sendAll(channel, ...args)`** — same file. Iterates all open windows and calls
`webContents.send` on each.

---

## Request / Response Channels

All channels below use `ipcRenderer.invoke` (renderer → main) and return a Promise.
The return type is the resolved value of that Promise.

### Device Management
Registered in: `src/main/lib/adb.ts`

| Channel | Arguments | Returns | Notes |
|---|---|---|---|
| `getDevices` | — | `IDevice[]` | Lists connected USB + TCP devices |
| `getOverview` | `deviceId: string` | overview object | Kernel, CPU, RAM, storage, Wi-Fi, resolution |
| `setFontScale` | `deviceId, scale: number` | `void` | `settings put system font_scale` |
| `screencap` | `deviceId: string` | `string` (base64 PNG) | Full-resolution screenshot |
| `getMemory` | `deviceId: string` | `{memTotal, memUsed}` | Reads `/proc/meminfo` |
| `getPerformance` | `deviceId: string` | perf object | CPU loads, temperature, memory, battery |
| `getUptime` | `deviceId: string` | `number` (ms) | Reads `/proc/uptime` |
| `connectDevice` | `host: string, port?: number` | `void` | TCP/IP connect |
| `disconnectDevice` | `host: string, port?: number` | `void` | TCP/IP disconnect |
| `inputKey` | `deviceId, keyCode: number` | `void` | `input keyevent <code>` |
| `openAdbCli` | — | `void` | Opens OS terminal in ADB directory |
| `dumpWindowHierarchy` | `deviceId: string` | `string` (XML) | `uiautomator dump` + pull |
| `root` | `deviceId: string` | `void` | Escalates ADB to root |
| `startWireless` | `deviceId: string` | `void` | Switches device to TCP/IP mode |
| `restartAdbServer` | — | `void` | `adb kill-server` then reconnect |
| `pairDevice` | `host, port: number, password: string` | `void` | Android 11+ wireless pairing |

### Interactive Shell
Registered in: `src/main/lib/adb/shell.ts`

| Channel | Arguments | Returns | Notes |
|---|---|---|---|
| `createShell` | `deviceId: string` | `string` (sessionId) | Opens PTY via `device.transport()`, negotiates `shell,v2:` |
| `writeShell` | `sessionId, data: string` | `void` | Encodes STDIN packet (id=0) and writes to socket |
| `resizeShell` | `sessionId, cols: number, rows: number` | `void` | Sends WINDOW_SIZE_CHANGE packet (id=5): `ROWSxCOLS,0x0\0` |
| `killShell` | `sessionId: string` | `void` | Calls `connection.end()`, removes session from ptys map |

### Logcat
Registered in: `src/main/lib/adb/logcat.ts`

| Channel | Arguments | Returns | Notes |
|---|---|---|---|
| `openLogcat` | `deviceId: string` | `string` (logcatId) | Opens logcat stream with `clear: true` |
| `closeLogcat` | `logcatId: string` | `void` | Ends reader, deletes session |
| `pauseLogcat` | `logcatId: string` | `void` | Suppresses `entry` events in-memory |
| `resumeLogcat` | `logcatId: string` | `void` | Re-enables `entry` events |

### Android Process Monitor
Registered in: `src/main/lib/adb/base.ts`

| Channel | Arguments | Returns | Notes |
|---|---|---|---|
| `getProcesses` | `deviceId: string` | `IProcess[]` | `top -b -n 1 -o pid,...`; falls back to `top -n 1` for older devices |
| `reverseTcp` | `deviceId, remote: string` | `number` (local port) | Reuses existing reverse if present; else allocates free port |

### File System
Registered in: `src/main/lib/adb/file.ts`

| Channel | Arguments | Returns | Notes |
|---|---|---|---|
| `readDir` | `deviceId, path: string` | `IFile[]` | `device.readdir()` or `ls -al` for /data/data/ paths |
| `statFile` | `deviceId, path: string` | `IFileStat` | `device.stat()` or `ls -ld` fallback |
| `pullFile` | `deviceId, src, dest: string` | `void` | Recursive; emits transfer progress events; handles /data/data/ via tmp copy |
| `pushFile` | `deviceId, src, dest: string` | `void` | Recursive; emits transfer progress events; handles /data/data/ via tmp copy |
| `openFile` | `deviceId, path: string` | `void` | Pulls to OS temp dir, then `shell.openPath()` |
| `deleteFile` | `deviceId, path: string` | `void` | `rm "path"` |
| `deleteDir` | `deviceId, path: string` | `void` | `rm -rf "path"` |
| `createDir` | `deviceId, path: string` | `void` | `mkdir -p "path"` |
| `moveFile` | `deviceId, src, dest: string` | `void` | `mv "src" "dest"` |

### Package Manager
Registered in: `src/main/lib/adb/package.ts`

| Channel | Arguments | Returns | Notes |
|---|---|---|---|
| `getPackages` | `deviceId, system?: boolean` | `string[]` | `pm list packages [-3]` |
| `getTopPackage` | `deviceId: string` | `{name, pid}` | Parses `dumpsys activity` for `top-activity` line |
| `startPackage` | `deviceId, pkg: string` | `void` | Resolves main component via `dumpsys package`, then `startActivity` |
| `stopPackage` | `deviceId, pkg: string` | `void` | `am force-stop <pkg>` |
| `clearPackage` | `deviceId, pkg: string` | `void` | `device.clear(pkg)` |
| `installPackage` | `deviceId, apkPath: string` | `void` | `device.install(apkPath)` |
| `uninstallPackage` | `deviceId, pkg: string` | `void` | `device.uninstall(pkg)` |
| `enablePackage` | `deviceId, pkg: string` | `void` | `pm enable <pkg>` |
| `disablePackage` | `deviceId, pkg: string` | `void` | `pm disable-user <pkg>` |

### Package Info & File Server
Registered in: `src/main/lib/adb/server.ts`

| Channel | Arguments | Returns | Notes |
|---|---|---|---|
| `getPackageInfos` | `deviceId, packageNames: string[]` | `IPackageInfo[]` | Communicates with on-device aya.dex via Protobuf over abstract Unix socket |
| `getFileUrl` | `deviceId, path: string, port?: number` | `string` (http URL) | Forwards device HTTP file server to local TCP port |

### Scrcpy / Screen Mirror
Registered in: `src/main/lib/adb/scrcpy.ts`

| Channel | Arguments | Returns | Notes |
|---|---|---|---|
| `startScrcpy` | `deviceId, args: string[]` | `void` | Pushes scrcpy.jar, runs via `app_process` |

### WebView Inspector
Registered in: `src/main/lib/adb/webview.ts`

| Channel | Arguments | Returns | Notes |
|---|---|---|---|
| `getWebviews` | `deviceId, pid: number` | `IWebview[]` | Scans `/proc/net/unix` for devtools socket, forwards to local port, fetches `/json` |

### Port Mapping
Registered in: `src/main/lib/adb/port.ts`

| Channel | Arguments | Returns | Notes |
|---|---|---|---|
| `listForwards` | `deviceId: string` | `{local, remote}[]` | `device.listForwards()` |
| `listReverses` | `deviceId: string` | `{local, remote}[]` | `device.listReverses()` |
| `forward` | `deviceId, local, remote: string` | `void` | `device.forward(local, remote)` |
| `reverse` | `deviceId, remote, local: string` | `void` | `device.reverse(remote, local)` |

### FPS Monitor
Registered in: `src/main/lib/adb/fps.ts`

| Channel | Arguments | Returns | Notes |
|---|---|---|---|
| `getFps` | `deviceId, pkg: string` | `number` | Primary: delta on `flips=` from `dumpsys SurfaceFlinger`; fallback: frame latency timestamps per layer |

### AVD Manager
Registered in: `src/main/window/avd.ts`

| Channel | Arguments | Returns | Notes |
|---|---|---|---|
| `getAvds` | `forceRefresh?: boolean` | `IAvd[]` | Reads `~/.android/avd/*.ini` config files; checks running PID via lock file |
| `startAvd` | `avdId: string` | `void` | Spawns `emulator @<avdId>` detached |
| `stopAvd` | `avdId: string` | `void` | `process.kill(avd.pid)`, removes lock file |
| `wipeAvdData` | `avdId: string` | `void` | Stops AVD, removes `snapshots/` and `userdata-qemu.img` |

### Window Management
Registered in: `src/main/window/main.ts`, `src/main/window/screencast.ts`, `src/main/window/devices.ts`, `src/main/lib/menu.ts`

| Channel | Arguments | Returns | Notes |
|---|---|---|---|
| `showScreencast` | — | `void` | Creates or focuses screencast window |
| `closeScreencast` | — | `void` | Closes screencast window |
| `restartScreencast` | — | `void` | Close + re-open screencast window |
| `showDevices` | — | `void` | Creates or focuses device manager window |
| `setScreencastAlwaysOnTop` | `alwaysOnTop: boolean` | `void` | `win.setAlwaysOnTop()` |
| `updateMenu` | — | `void` | Rebuilds the application menu; registered at startup via `src/main/lib/menu.ts` |

### Persistent Store Access
Each store has isolated get/set channels. Only `mainStore`, `settingsStore`, and `memStore`
push change events back to all windows (see Push Channels section). `screencastStore`
and `devicesStore` do **not** emit push events.

| Channel | Arguments | Returns | Source |
|---|---|---|---|
| `getMainStore` | `name: string` | `any` | `src/main/window/main.ts` |
| `setMainStore` | `name, val: any` | `void` | `src/main/window/main.ts` |
| `getScreencastStore` | `name: string` | `any` | `src/main/window/screencast.ts` |
| `setScreencastStore` | `name, val: any` | `void` | `src/main/window/screencast.ts` |
| `getDevicesStore` | `name: string` | `any` | `src/main/window/devices.ts` |
| `setDevicesStore` | `name, val: any` | `void` | `src/main/window/devices.ts` |
| `getSettingsStore` | `name: string` | `any` | `src/share/main/lib/ipc.ts` |
| `setSettingsStore` | `name, val: any` | `void` | `src/share/main/lib/ipc.ts` |
| `getMemStore` | `name: string` | `any` | `src/share/main/lib/ipc.ts` |
| `setMemStore` | `name, val: any` | `void` | `src/share/main/lib/ipc.ts` |

### Language & Theme
Registered in: `src/share/main/lib/language.ts`, `src/share/main/lib/theme.ts` — both registered at startup

| Channel | Arguments | Returns | Notes |
|---|---|---|---|
| `getLanguage` | — | `string` | Resolved from settings or system locale at startup; e.g. `'en-US'`, `'zh-CN'` |
| `getTheme` | — | `string` | Current effective theme: `'light'` or `'dark'`; derived from `nativeTheme` |

### Electron Process Monitor (Host)
Registered in: `src/share/main/window/process.ts` — lazily on first `showProcess()` call

These channels expose **Electron app process metrics** (CPU, memory, and renderer info for the
desktop app itself) and are entirely distinct from `getProcesses`, which lists Android device processes.

| Channel | Arguments | Returns | Notes |
|---|---|---|---|
| `getProcessData` | — | `IProcess[]` | All Electron sub-processes via `app.getAppMetrics()`; includes CPU %, working set size, and `webContentsId` |
| `killProcess` | `pid: number` | `void` | `process.kill(pid)` on a sub-process |
| `openDevtools` | `webContentsId: number` | `void` | Opens detached DevTools for a specific renderer via `webContents.fromId()` |
| `debugMainProcess` | — | `void` | Dev-mode only: opens a DevTools window pointed at the Node.js inspector on port 9229 |

### Shared / Platform Utilities
Registered in: `src/share/main/lib/ipc.ts`

| Channel | Arguments | Returns | Notes |
|---|---|---|---|
| `showOpenDialog` | `options: OpenDialogOptions` | `{canceled, filePaths}` | Native OS open dialog |
| `showSaveDialog` | `options: SaveDialogOptions` | `{canceled, filePath}` | Native OS save dialog |
| `openExternal` | `url: string` | `void` | Opens URL in default browser |
| `openPath` | `path: string` | `void` | Opens path in default OS app |
| `showItemInFolder` | `path: string` | `void` | Reveals file in OS file manager |
| `openWindow` | `url, name, options` | `void` | Creates a new BrowserWindow and loads URL |
| `sendToWindow` | `name, channel, ...args` | `void` | Proxy: calls `window.sendTo()` from renderer |
| `toggleDevTools` | — | `void` | Toggles DevTools on focused window |
| `closeWin` | — | `void` | Closes the sender's own BrowserWindow |
| `hideWin` | — | `void` | Hides the sender's own BrowserWindow |
| `toggleWinMaximize` | — | `void` | Maximize / unmaximize sender's window |
| `relaunch` | — | `void` | `app.relaunch()` + `app.exit()` |
| `isCustomTitlebar` | — | `boolean` | Returns whether the window uses a custom titlebar |
| `getOpenFile` | `ext: string` | `string` (path) | Returns file path from argv or macOS `open-file` event |
| `resolveResources` | `path: string` | `string` (abs path) | Resolves a path inside `resources/`, handles asar unpacking |
| `getFileIcon` | `ext: string` | `string` (data URL) | OS file type icon as data URL; cached per extension |
| `showTerminal` | — | `void` | Opens the built-in terminal window |
| `getLogs` | — | `string[]` | Returns the in-memory captured stdout/stderr buffer; lazy, registered on first `showTerminal()` |
| `clearLogs` | — | `void` | Clears the in-memory log buffer; lazy, registered on first `showTerminal()` |
| `showVideo` | `url: string` | `void` | Opens the video player window |
| `showProcess` | — | `void` | Opens the process monitor window |
| `getCpuAndMem` | — | `{cpu: number, memory: number}` | Host machine CPU/memory (not device); `memory` is working set size in KB |
| `showContextMenu` | `x, y: number, template` | `void` | Shows native context menu at coordinates |

---

## Push Channels

All channels below use `webContents.send` (main → renderer) and are received with
`main.on(channel, callback)` in the renderer. There is no return value.

### Device Events

| Channel | Arguments | Sender | Consumers |
|---|---|---|---|
| `changeDevice` | — | `src/main/lib/adb.ts` via `window.sendAll` | All windows; triggers device list refresh |

### Shell Events

| Channel | Arguments | Sender | Notes |
|---|---|---|---|
| `shellData` | `sessionId: string, data: string` | `src/main/lib/adb/shell.ts` via `window.sendTo('main', ...)` | Terminal output chunk; guarded by sessionId in Term.tsx |

### Logcat Events

| Channel | Arguments | Sender | Notes |
|---|---|---|---|
| `logcatEntry` | `logcatId: string, entry: LogcatEntry` | `src/main/lib/adb/logcat.ts` via `window.sendTo('main', ...)` | Single log entry with PID resolved to package name |

### File Transfer Events

| Channel | Arguments | Sender | Notes |
|---|---|---|---|
| `startTransfer` | `id, type: TransferType, src, dest: string, size?: number` | `src/main/lib/adb/file.ts` via `window.sendTo('main', ...)` | Signals start of upload or download |
| `updateTransfer` | `id: string, bytesTransferred: number` | `src/main/lib/adb/file.ts` via `window.sendTo('main', ...)` | Progress update, throttled to 500ms |
| `finishTransfer` | `id: string` | `src/main/lib/adb/file.ts` via `window.sendTo('main', ...)` | Signals transfer complete or failed |

### Store Change Events
Pushed via `window.sendAll` when a value is written to one of the three stores that
actively monitor changes. `screencastStore` and `devicesStore` do **not** emit push events.

| Channel | Arguments | Source Store |
|---|---|---|
| `changeMainStore` | `name: string, val: any` | Main window store (`data/main.json`) |
| `changeSettingsStore` | `name: string, val: any` | Global settings store (`data/settings.json`) |
| `changeMemStore` | `name: string, val: any` | In-memory ephemeral store |

### Window Lifecycle Events
Sent by the window manager (`src/share/main/lib/window.ts`) to each window's own
renderer, not broadcast globally.

| Channel | Arguments | Trigger |
|---|---|---|
| `showWin` | — | `win.on('show')` |
| `focusWin` | — | `win.on('focus')` |

### OS Integration Events

| Channel | Arguments | Sender | Notes |
|---|---|---|---|
| `installPackage` | `apkPath: string` | `src/main/window/main.ts` via `window.sendTo('main', ...)` | Fired on macOS `open-file` event or Windows `second-instance` when an `.apk` is opened |

### Theme Events

| Channel | Arguments | Sender | Notes |
|---|---|---|---|
| `changeTheme` | — | `src/share/main/lib/theme.ts` via `window.sendAll` | Fired when `nativeTheme` changes (system) or when the `theme` settings key is written |

### Auto-Updater Events

| Channel | Arguments | Sender | Notes |
|---|---|---|---|
| `updateAvailable` | — | `src/share/main/lib/updater.ts` via `window.sendTo('main', ...)` | New version found by `electron-updater` |
| `updateNotAvailable` | — | `src/share/main/lib/updater.ts` via `window.sendTo('main', ...)` | Update check completed; app is up to date |
| `updateError` | — | `src/share/main/lib/updater.ts` via `window.sendTo('main', ...)` | Auto-updater encountered an error |

### Terminal Log Events

| Channel | Arguments | Sender | Notes |
|---|---|---|---|
| `addLog` | `data: string` | `src/share/main/window/terminal.ts` via `window.sendTo('terminal', ...)` | Intercepts `process.stdout`/`stderr` writes; sent to the terminal window only, not broadcast |

### Video Player Events

| Channel | Arguments | Sender | Notes |
|---|---|---|---|
| `setVideoUrl` | `url: string` | `src/share/main/window/video.ts` via `window.sendTo('video', ...)` | Sent only when `showVideo()` is called while the video window is already open |

### Menu Events

| Channel | Arguments | Sender | Notes |
|---|---|---|---|
| `refreshMenu` | — | `src/main/lib/menu.ts` via `window.sendTo('main', ...)` | Windows only; signals the renderer to rebuild the custom titlebar menu after `updateMenu` |

---

## Session-Keyed Streaming Channels

Three channels use a **session ID** pattern to multiplex multiple concurrent streams
over a single named IPC channel. The session ID is returned by the `open*` / `create*`
call and must be passed to all subsequent operations and matched in push event handlers.

```
Shell sessions:
  createShell(deviceId) → sessionId
  writeShell(sessionId, data)
  resizeShell(sessionId, cols, rows)
  killShell(sessionId)
  push: shellData(sessionId, data)

Logcat sessions:
  openLogcat(deviceId) → logcatId
  pauseLogcat(logcatId)
  resumeLogcat(logcatId)
  closeLogcat(logcatId)
  push: logcatEntry(logcatId, entry)

File transfers:
  pullFile / pushFile → generates internal uuid (not exposed to renderer)
  push: startTransfer(transferId, ...)
  push: updateTransfer(transferId, bytesTransferred)
  push: finishTransfer(transferId)
```

---

## Singleton-Wrapped Handlers

Several handlers are wrapped with `licia/singleton`, meaning concurrent invocations
with the same arguments will share a single in-flight Promise rather than issuing
duplicate ADB commands. This is a performance optimisation for hot-path polling.

| Channel | Key |
|---|---|
| `getPackages` | `deviceId` |
| `getTopPackage` | `deviceId` |
| `getProcesses` | `deviceId` |
| `getPidNames` | `deviceId` |
| `getWebviews` | `deviceId, pid` |
| `getPackageInfos` | `deviceId, packageNames` |
| `getFileServerPort` | `deviceId` |

---

## IPC Registration Sequence

```
app.on('ready')
  ├── share/main/lib/ipc.ts → ipc.init()
  │     Registers: platform utilities, store access, dialog, window controls
  │     push: changeSettingsStore, changeMemStore (on store 'change' events)
  │
  ├── share/main/lib/language.ts → language.init()
  │     Registers: getLanguage
  │
  ├── share/main/lib/theme.ts → theme.init()
  │     Registers: getTheme
  │     push: changeTheme (on nativeTheme update or settings theme change)
  │
  ├── share/main/lib/updater.ts → updater.init()
  │     push: updateAvailable, updateNotAvailable, updateError
  │
  ├── src/main/lib/menu.ts → menu.init()
  │     Registers: updateMenu
  │     push: refreshMenu (Windows only, on menu rebuild)
  │
  └── src/main/index.ts → adb.init()
        Registers: getDevices, getOverview, screencap, ...
        ├── base.init(client)     → reverseTcp, getProcesses
        ├── logcat.init(client)   → openLogcat, closeLogcat, pauseLogcat, resumeLogcat
        ├── shell.init(client)    → createShell, writeShell, resizeShell, killShell
        ├── server.init(client)   → getPackageInfos, getFileUrl
        ├── scrcpy.init(client)   → startScrcpy
        ├── package.init(client)  → getPackages, startPackage, stopPackage, ...
        ├── file.init(client)     → pullFile, pushFile, readDir, ...
        ├── fps.init()            → getFps
        ├── webview.init()        → getWebviews
        └── port.init(client)     → listForwards, listReverses, forward, reverse

  window.showWin() → main.ts → initIpc() [once]
        Registers: setMainStore, getMainStore, showScreencast,
                   closeScreencast, restartScreencast, showDevices
        push: changeMainStore (on store 'change' event)

  Lazily registered on first showWin() call (guarded by licia/once):
    AVD window:        getAvds, startAvd, stopAvd, wipeAvdData
    Screencast window: setScreencastStore, getScreencastStore, setScreencastAlwaysOnTop
    Devices window:    setDevicesStore, getDevicesStore
    Terminal window:   getLogs, clearLogs
                       push: addLog (intercepts process.stdout/stderr)
    Process window:    getProcessData, killProcess, openDevtools, debugMainProcess
    Video window:      push: setVideoUrl (only when showVideo() reuses existing window)
```

---

## Complete Channel Count

| Category | Request/Response | Push |
|---|---|---|
| Device management | 16 | 1 |
| Interactive shell | 4 | 1 |
| Logcat | 4 | 1 |
| Android process monitor | 2 | 0 |
| File system | 9 | 3 |
| Package manager | 9 | 0 |
| Package info & file server | 2 | 0 |
| Scrcpy | 1 | 0 |
| WebView inspector | 1 | 0 |
| Port mapping | 4 | 0 |
| FPS monitor | 1 | 0 |
| AVD manager | 4 | 0 |
| Window management & menu | 6 | 4 |
| Persistent store access | 10 | 3 |
| Language & theme | 2 | 1 |
| Electron process monitor (host) | 4 | 0 |
| Platform utilities | 15 | 0 |
| Terminal window | 2 | 1 |
| Auto-updater | 0 | 3 |
| Video player | 0 | 1 |
| **Total** | **96** | **19** |
