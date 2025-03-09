export interface IDevice {
  id: string
  name: string
  androidVersion: string
  sdkVersion: string
}

export type IpcGetFps = (deviceId: string, pkg: string) => Promise<number>
export type IpcGetDevices = () => Promise<IDevice[]>
export type IpcSetScreencastAlwaysOnTop = (alwaysOnTop: boolean) => void
export type IpcGetLogs = () => string[]
