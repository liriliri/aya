import { observer } from 'mobx-react-lite'
import Style from './Overview.module.scss'
import { useEffect, useState } from 'react'
import isEmpty from 'licia/isEmpty'
import fileSize from 'licia/fileSize'
import types from 'licia/types'
import { notify, t } from '../../../lib/util'
import store from '../../store'
import copy from 'licia/copy'

export default observer(function Overview() {
  const [overview, setOverview] = useState<types.PlainObj<string | number>>({})

  useEffect(() => {
    if (store.device) {
      main.getOverview(store.device.id).then(setOverview)
    }
  }, [])

  if (isEmpty(overview)) {
    return <div className={Style.container}>{t('deviceNotConnected')}</div>
  }

  return (
    <div className={Style.container}>
      <div className={Style.info}>
        <div className={Style.row}>
          {item(t('name'), overview.name, 'phone')}
          {item(t('brand'), overview.brand)}
          {item(t('model'), overview.model, 'model')}
        </div>
        <div className={Style.row}>
          {item(t('serialNum'), overview.serialNumber, 'serial-number')}
          {item(
            t('androidVersion'),
            `Android ${overview.androidVersion} (API ${overview.sdkVersion})`,
            'android'
          )}
          {item(
            t('processor'),
            `${overview.processor} (${overview.abi})`,
            'processor'
          )}
        </div>
        <div className={Style.row}>
          {item(
            t('resolution'),
            `${overview.resolution} (${overview.density}dpi)`,
            'phone'
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
      </div>
    </div>
  )
})

function item(title, value, icon = 'info') {
  function copyValue() {
    copy(value)
    notify(t('copied'), { icon: 'info' })
  }

  return (
    <div className={Style.item} onDoubleClick={copyValue}>
      <div className={Style.title}>
        <span className={`icon-${icon}`}></span>
        &nbsp;{title}
      </div>
      <div>{value}</div>
    </div>
  )
}
