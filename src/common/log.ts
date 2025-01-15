import BaseLogger from 'licia/Logger'
import toArr from 'licia/toArr'
import clone from 'licia/clone'
import each from 'licia/each'
import dateFormat from 'licia/dateFormat'

const consoleMethods: any = {}
each(['trace', 'log', 'info', 'warn', 'error'], (name) => {
  consoleMethods[name] = console[name].bind(console)
})

class Logger extends BaseLogger {
  _log(type: string, argList: any[]) {
    argList = toArr(argList)
    if (argList.length === 0) return this

    this.emit('all', type, clone(argList))

    if (BaseLogger.level[type.toUpperCase()] < (this as any)._level) return this
    this.emit(type, clone(argList))
    const consoleMethod =
      type === 'debug' ? consoleMethods.log : consoleMethods[type]
    consoleMethod(...this.formatter(type, argList))

    return this
  }
}

const loggers: Logger[] = []

type LogFn = {
  (name: string): Logger
  setLevel(level: number | string): void
}

let level: number | string = 'trace'

const log = ((name: string) => {
  const logger = new Logger(name)
  logger.setLevel(level)
  logger.formatter = function (type, argList) {
    argList.unshift(dateFormat('HH:MM:ss.l'), toLetter(type), this.name + ':')

    return argList
  }

  loggers.push(logger)

  return logger
}) as LogFn

log.setLevel = function (l) {
  level = l
  each(loggers, (logger) => logger.setLevel(level))
}

function toLetter(type: string) {
  const letters = {
    info: 'I',
    warn: 'W',
    error: 'E',
    debug: 'D',
  }

  return letters[type] || '?'
}

export default log
