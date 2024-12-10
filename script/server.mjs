import wire from '../src/main/lib/wire.js'
import adb from '@devicefarmer/adbkit'
import isEmpty from 'licia/isEmpty.js'
import isWindows from 'licia/isWindows.js'

const Adb = adb.default

$.verbose = true

cd('server')

const command = process.argv[3]

async function build() {
  await $`./gradlew :server:assembleRelease`
}

async function start() {
  if (isWindows) {
    await $`MSYS_NO_PATHCONV=1 adb push aya.dex /data/local/tmp/aya.dex`
    await $`MSYS_NO_PATHCONV=1 adb shell CLASSPATH=/data/local/tmp/aya.dex app_process /system/bin io.liriliri.aya.Server`
  } else {
    await $`adb push aya.dex /data/local/tmp/aya.dex`
    await $`adb shell CLASSPATH=/data/local/tmp/aya.dex app_process /system/bin io.liriliri.aya.Server`
  }
}

async function test() {
  const client = Adb.createClient()
  const devices = await client.listDevices()
  if (isEmpty(devices)) {
    return
  }
  const device = client.getDevice(devices[0].id)
  const socket = await device.openLocal('localabstract:aya')
  socket.write(
    wire.io.liriliri.aya.Request.encodeDelimited({
      id: '1',
      method: 'getPackageInfo',
      params: '{"packageName": "io.liriliri.eruda"}',
    }).finish()
  )
  socket.on('readable', () => {
    const buf = socket.read()
    if (buf) {
      const message = wire.io.liriliri.aya.Response.decodeDelimited(buf)
      console.log(message)
    }
  })
}

if (command === 'build') {
  build()
} else if (command === 'start') {
  start()
} else if (command === 'test') {
  test()
}
