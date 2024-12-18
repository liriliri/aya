import builder from 'electron-builder'

cd('dist')

const pkg = await fs.readJson('package.json')

const config = {
  directories: {
    output: `../release/${pkg.version}`,
  },
  files: ['main', 'preload', 'renderer', 'adb', 'server'],
  asarUnpack: ['adb/**/*', 'server/**/*'],
  artifactName: '${name}-${version}-${os}-${arch}.${ext}',
  win: {
    target: [
      {
        target: 'nsis',
      },
    ],
  },
  mac: {
    electronLanguages: ['zh_CN', 'en'],
  },
}

await builder.build({
  config,
})
