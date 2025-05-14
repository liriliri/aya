import { DOMParser, MIME_TYPE } from '@xmldom/xmldom'
import isNumeric from 'licia/isNumeric'
import trim from 'licia/trim'

const domParser = new DOMParser()
export function xmlToDom(str: string) {
  return domParser.parseFromString(str, MIME_TYPE.XML_TEXT)
}

export function normalizePort(port: string) {
  port = trim(port)

  if (isNumeric(port)) {
    return `tcp:${port}`
  }

  return port
}
