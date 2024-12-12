import adb from '@devicefarmer/adbkit'
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

if (command === 'build') {
  build()
} else if (command === 'start') {
  start()
}
