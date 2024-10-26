import isArrBuffer from 'licia/isArrBuffer'
import convertBin from 'licia/convertBin'

export function copyData(buf: any, mime: string) {
  if (!isArrBuffer(buf)) {
    buf = convertBin(buf, 'ArrayBuffer')
  }
  navigator.clipboard.write([
    new ClipboardItem({
      [mime]: new Blob([buf], {
        type: mime,
      }),
    }),
  ])
}
