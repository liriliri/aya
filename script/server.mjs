$.verbose = true
cd('server')
await $`./gradlew :server:assembleRelease`
await fs.remove('../resources/aya.dex')
await fs.move('aya.dex', '../resources/aya.dex')
