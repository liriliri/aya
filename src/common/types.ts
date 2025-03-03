export interface IDevice {
  id: string
  name: string
  androidVersion: string
  sdkVersion: string
}

export type IpcGetFps = (deviceId: string, pkg: string) => Promise<number>
