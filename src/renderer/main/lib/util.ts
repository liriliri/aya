import { DOMParser, MIME_TYPE } from '@xmldom/xmldom'

const domParser = new DOMParser()
export function xmlToDom(str: string) {
  return domParser.parseFromString(str, MIME_TYPE.XML_TEXT)
}
