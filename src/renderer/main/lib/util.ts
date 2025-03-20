import isArrBuffer from 'licia/isArrBuffer'
import convertBin from 'licia/convertBin'
import { DOMParser, MIME_TYPE } from '@xmldom/xmldom'

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

const domParser = new DOMParser()
export function xmlToDom(str: string) {
  return domParser.parseFromString(str, MIME_TYPE.XML_TEXT)
}
