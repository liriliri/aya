import wire from '../src/main/lib/wire.js'
import adb from '@devicefarmer/adbkit'
import isEmpty from 'licia/isEmpty.js'
import isWindows from 'licia/isWindows.js'

const Adb = adb.default

cd('server')

const command = process.argv[3]

async function build() {
  await $`./gradlew :server:assembleRelease`
  await fs.copy('server.dex', '../dist/server/server.dex')
  await fs.copy('start.sh', '../dist/server/start.sh')
}

async function start() {
  if (isWindows) {
    await $`MSYS_NO_PATHCONV=1 adb push server.dex /data/local/tmp/aya/server.dex`
    await $`MSYS_NO_PATHCONV=1 adb shell CLASSPATH=/data/local/tmp/aya/server.dex app_process /system/bin io.liriliri.aya.Server`
  } else {
    await $`adb push server.dex /data/local/tmp/aya/server.dex`
    await $`adb shell CLASSPATH=/data/local/tmp/aya/server.dex app_process /system/bin io.liriliri.aya.Server`
  }
}

async function test() {
  const client = Adb.createClient()
  const devices = await client.listDevices()
  if (isEmpty(devices)) {
    return
  }
  const device = client.getDevice(devices[0].id)
  const connection = await device.openLocal('localabstract:aya')
  connection.write(
    wire.io.liriliri.aya.proto.Request.encode({
      id: '1',
      method: 'getPackages',
    }).finish()
  )
}

if (command === 'build') {
  build()
} else if (command === 'start') {
  start()
} else if (command === 'test') {
  test()
}
