import builder from 'electron-builder'

cd('dist')

const pkg = await fs.readJson('package.json')

const config = {
  directories: {
    output: `../release/${pkg.version}`,
  },
  files: ['main', 'preload', 'renderer', 'adb', 'server'],
  asarUnpack: ['adb/**/*', 'server/**/*'],
  artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
  nsis: {
    allowToChangeInstallationDirectory: true,
    oneClick: false,
    installerSidebar: 'build/installerSidebar.bmp',
  },
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
  publish: {
    provider: 'generic',
    url: 'https://release.liriliri.io/',
    channel: '${productName}-latest',
  },
}

await builder.build({
  config,
})
