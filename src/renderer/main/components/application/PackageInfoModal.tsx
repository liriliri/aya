import LunaModal from 'luna-modal/react'
import { createPortal } from 'react-dom'
import { t } from '../../../lib/util'
import Style from './PackageInfoModal.module.scss'
import defaultIcon from '../../../assets/img/default-icon.png'
import fileSize from 'licia/fileSize'
import dateFormat from 'licia/dateFormat'

interface IProps {
  visible: boolean
  packageInfo: IPackageInfo
  onClose: () => void
}

interface IPackageInfo {
  icon: string
  label: string
  packageName: string
  versionName: string
  apkSize: number
  system: boolean
  firstInstallTime: number
  lastUpdateTime: number
  minSdkVersion?: number
  targetSdkVersion?: number
}

export default function PackageInfoModal(props: IProps) {
  const { packageInfo } = props

  return createPortal(
    <LunaModal
      title={t('packageInfo')}
      visible={props.visible}
      width={400}
      onClose={props.onClose}
    >
      <div className={Style.header}>
        <div className={Style.icon}>
          <img src={packageInfo.icon || defaultIcon} />
        </div>
        <div className={Style.basic}>
          <div className={Style.label}>{packageInfo.label}</div>
          <div className={Style.packageName}>{packageInfo.packageName}</div>
          <div className={Style.versionName}>{packageInfo.versionName}</div>
        </div>
      </div>
      {item(t('sysPackage'), packageInfo.system ? t('yes') : t('no'))}
      {packageInfo.minSdkVersion &&
        item(t('minSdkVersion'), packageInfo.minSdkVersion)}
      {packageInfo.targetSdkVersion &&
        item(t('targetSdkVersion'), packageInfo.targetSdkVersion)}
      {item(
        t('firstInstallTime'),
        dateFormat(
          new Date(packageInfo.firstInstallTime),
          'yyyy-mm-dd HH:MM:ss'
        )
      )}
      {item(
        t('lastUpdateTime'),
        dateFormat(new Date(packageInfo.lastUpdateTime), 'yyyy-mm-dd HH:MM:ss')
      )}
      {item(t('apkSize'), fileSize(packageInfo.apkSize))}
    </LunaModal>,
    document.body
  )
}

function item(title: string, value: string | number) {
  return (
    <div className={Style.item}>
      <span>{title}</span>
      <span className={Style.value}>{value}</span>
    </div>
  )
}
