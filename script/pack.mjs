import builder, { publish } from 'electron-builder'
import isMac from 'licia/isMac.js'
import isWindows from 'licia/isWindows.js'

cd('dist')

const pkg = await fs.readJson('package.json')

let publishChannel = '${productName}-latest'
if (isMac && process.arch !== 'arm64') {
  publishChannel = '${productName}-latest-${arch}'
}

const config = {
  appId: pkg.appId,
  directories: {
    output: `../release/${pkg.version}`,
  },
  files: ['main', 'preload', 'renderer'],
  artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
  extraResources: {
    from: 'resources',
    to: './',
    filter: ['**/*'],
  },
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
    target: [
      {
        target: 'dmg',
      },
    ],
    icon: 'build/icon.icns',
  },
  publish: {
    provider: 'generic',
    url: 'https://release.liriliri.io/',
    channel: publishChannel,
  },
}

if (isMac) {
  const args = process.argv.slice(2)
  const entitlements = {
    entitlements: 'build/entitlements.mas.plist',
    entitlementsInherit: 'build/entitlements.mas.inherit.plist',
  }
  if (args.includes('--mas-dev')) {
    config.mac.target = [
      {
        target: 'mas-dev',
      },
    ]
    config.masDev = {
      ...entitlements,
      provisioningProfile: 'build/mas-dev.provisionprofile',
    }
  } else if (args.includes('--mas')) {
    config.mac.target = [
      {
        target: 'mas',
      },
    ]
    config.mac.extendInfo = {
      LSMinimumSystemVersion: '12.0',
    }
    config.mas = {
      ...entitlements,
      provisioningProfile: 'build/mas.provisionprofile',
    }
  }
}

if (isWindows) {
  const args = process.argv.slice(2)
  if (args.includes('--appx')) {
    config.win.target = [
      {
        target: 'appx',
      },
    ]
    config.appx = {
      identityName: 'LiriLiri.AYAAndroidManager',
      publisher: 'CN=B8CA87F2-EAEA-4C05-B38C-AAA50D3CBA24',
      publisherDisplayName: 'surunzi',
      displayName: 'AYA Android Manager',
    }
  }
}

await builder.build({
  config,
})
