$.verbose = true
cd('server')
await $`./gradlew :server:assembleRelease`
await fs.move('aya.dex', '../resources/aya.dex')
