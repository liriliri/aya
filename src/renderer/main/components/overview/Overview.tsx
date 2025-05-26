import { observer } from 'mobx-react-lite'
import Style from './Overview.module.scss'
import { useEffect, useState } from 'react'
import isEmpty from 'licia/isEmpty'
import fileSize from 'licia/fileSize'
import types from 'licia/types'
import { notify } from 'share/renderer/lib/util'
import { t } from '../../../../common/util'
import store from '../../store'
import copy from 'licia/copy'
import { PannelLoading } from '../common/loading'
import className from 'licia/className'
import FontAdjustModal from './FontAdjustModal'
import LunaToolbar, { LunaToolbarSpace } from 'luna-toolbar/react'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import PortMappingModal from './PortMappingModal'
import RemoteControllerModal from './RemoteControllerModal'
import toBool from 'licia/toBool'

export default observer(function Overview() {
  const [portModalVisible, setPortModalVisible] = useState(false)
  const [remoteControllerModalVisible, setRemoteControllerModalVisible] =
    useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [overview, setOverview] = useState<
    types.PlainObj<string | number | boolean>
  >({})
  const [fontAdjustModalVisible, setFontAdjustModalVisible] = useState(false)

  const { device } = store

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    if (!device || isLoading) {
      return
    }

    try {
      setIsLoading(true)
      const overview = await main.getOverview(device.id)
      setOverview(overview)
    } catch {
      notify(t('commonErr'), { icon: 'error' })
    }

    setIsLoading(false)
  }

  let content: JSX.Element | null = null

  if (!device) {
    content = (
      <div className={className('panel-body', Style.container)}>
        {t('deviceNotConnected')}
      </div>
    )
  } else if (isLoading) {
    content = <PannelLoading />
  } else if (!isEmpty(overview)) {
    content = (
      <div className={Style.info}>
        <div className={Style.row}>
          {item(t('name'), overview.name, 'phone')}
          {item(t('brand'), overview.brand)}
          {item(t('model'), overview.model, 'model')}
        </div>
        <div className={Style.row}>
          {item(t('serialno'), overview.serialno, 'serial-number')}
          {item(
            t('androidVersion'),
            `Android ${device.androidVersion} (API ${device.sdkVersion})`,
            'android'
          )}
          {item(t('kernelVersion'), overview.kernelVersion, 'android')}
        </div>
        <div className={Style.row}>
          {item(
            t('processor'),
            `${overview.processor || t('unknown')} ${t('cpuNum', {
              count: overview.cpuNum,
            })} (${overview.abi})`,
            'processor'
          )}
          {item(
            t('storage'),
            `${fileSize(overview.storageUsed as number)} / ${fileSize(
              overview.storageTotal as number
            )}`,
            'storage'
          )}
          {item(t('memory'), fileSize(overview.memTotal as number), 'memory')}
        </div>
        <div className={Style.row}>
          {item(
            t('physicalResolution'),
            `${overview.physicalResolution} (${overview.physicalDensity}dpi)`,
            'phone'
          )}
          {item(
            t('resolution'),
            `${overview.resolution} (${overview.density}dpi)`,
            'phone'
          )}
          {item(
            t('fontScale'),
            overview.fontScale ? `${overview.fontScale}x` : '1x',
            'font',
            overview.fontScale
              ? () => setFontAdjustModalVisible(true)
              : undefined
          )}
        </div>
        <div className={Style.row}>
          {item('Wi-Fi', overview.wifi, 'wifi')}
          {item(t('ipAddress'), overview.ip, 'browser')}
          {item(t('macAddress'), overview.mac, 'browser')}
        </div>
        <FontAdjustModal
          visible={fontAdjustModalVisible}
          initialScale={overview.fontScale as number}
          onClose={() => {
            setFontAdjustModalVisible(false)
            refresh()
          }}
        />
      </div>
    )
  }

  async function root() {
    if (!device || overview.root) {
      return
    }
    try {
      await main.root(device.id)
      setTimeout(() => refresh(), 2000)
    } catch {
      notify(t('rootModeErr'), { icon: 'error' })
    }
  }

  async function restartAdbServer() {
    await main.restartAdbServer()
    notify(t('adbServerRestarted'), { icon: 'success' })
  }

  return (
    <div className={className('panel-with-toolbar', Style.container)}>
      <LunaToolbar className="panel-toolbar">
        <ToolbarIcon
          icon="terminal"
          title={t('adbCli')}
          onClick={() => main.openAdbCli()}
        />
        <ToolbarIcon
          icon="reset"
          title={t('restartAdbServer')}
          onClick={restartAdbServer}
        />
        <ToolbarIcon
          icon="unlock"
          disabled={!device || toBool(overview.root)}
          state={toBool(overview.root) ? 'active' : ''}
          title={t('rootMode')}
          onClick={root}
        />
        <ToolbarIcon
          icon="bidirection"
          disabled={!device}
          title={t('portMapping')}
          onClick={() => setPortModalVisible(true)}
        />
        <ToolbarIcon
          icon="remote-controller"
          disabled={!device}
          title={t('remoteController')}
          onClick={() => setRemoteControllerModalVisible(true)}
        />
        <LunaToolbarSpace />
        <ToolbarIcon
          icon="refresh"
          title={t('refresh')}
          disabled={isLoading || !device}
          onClick={() => refresh()}
        />
      </LunaToolbar>
      {content}
      <PortMappingModal
        visible={portModalVisible}
        onClose={() => setPortModalVisible(false)}
      />
      <RemoteControllerModal
        visible={remoteControllerModalVisible}
        onClose={() => setRemoteControllerModalVisible(false)}
      />
    </div>
  )
})

function item(title, value, icon = 'info', onDoubleClick?: () => void) {
  function copyValue() {
    setTimeout(() => {
      if (hasDoubleClick) {
        return
      }
      copy(value)
      notify(t('copied'), { icon: 'info' })
    }, 200)
  }

  let hasDoubleClick = false

  return (
    <div
      className={Style.item}
      onClick={copyValue}
      onDoubleClick={() => {
        if (!onDoubleClick) {
          return
        }
        hasDoubleClick = true
        onDoubleClick()
      }}
    >
      <div className={Style.title}>
        <span className={`icon-${icon}`}></span>
        &nbsp;{title}
      </div>
      <div className={Style.value}>{value || t('unknown')}</div>
    </div>
  )
}
