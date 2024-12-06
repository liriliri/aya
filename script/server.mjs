cd('server')

await $`./gradlew :server:assembleRelease`
await fs.copy('server.dex', '../dist/server/server.dex')
await fs.copy('start.sh', '../dist/server/start.sh')
