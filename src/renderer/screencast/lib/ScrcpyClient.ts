import strHash from 'licia/strHash'
import toStr from 'licia/toStr'
import type net from 'node:net'
import lpad from 'licia/lpad'
import Emitter from 'licia/Emitter'
import log from '../../../common/log'
import singleton from 'licia/singleton'
import {
  ScrcpyOptions3_1,
  ScrcpyVideoCodecId,
  ScrcpyAudioCodec,
  ScrcpyControlMessageWriter,
  AndroidMotionEventAction,
  AndroidMotionEventButton,
  AndroidKeyEventAction,
  AndroidKeyCode,
} from '@yume-chan/scrcpy'
import { InspectStream, WritableStream } from '@yume-chan/stream-extra'
import {
  WebCodecsVideoDecoder,
  InsertableStreamVideoFrameRenderer,
} from '@yume-chan/scrcpy-decoder-webcodecs'
import { Float32PcmPlayer } from '@yume-chan/pcm-player'
import Readiness from 'licia/Readiness'
import { OpusStream } from './AudioStream'
import { socketToReadableStream, socketToReadableWritablePair } from './util'
import clamp from 'licia/clamp'

const logger = log('ScrcpyClient')

export default class ScrcpyClient extends Emitter {
  private deviceId: string
  private server?: net.Server
  private video: any
  private audio: any
  private control: any
  private started = false
  private options: ScrcpyOptions3_1
  private readiness = new Readiness()
  constructor(deviceId: string, options: ScrcpyOptions3_1) {
    super()

    this.options = options
    options.value.scid = toStr(strHash(deviceId) % 999999)
    this.deviceId = deviceId
  }
  async getVideo() {
    await this.start()
    return this.video
  }
  destroy() {
    logger.info('destroy')

    if (this.server) {
      this.server.close()
    }
  }
  private start = singleton(async () => {
    if (this.started) {
      return
    }
    const { deviceId, options } = this

    const port = await main.reverseTcp(
      this.deviceId,
      `localabstract:scrcpy_${lpad(options.value.scid as string, 8, '0')}`
    )

    const server = node.createServer(async (socket) => {
      if (!this.video) {
        logger.info('video stream connected')
        this.video = {}
        await this.createVideo(socket)
      } else if (!this.audio) {
        logger.info('audio stream connected')
        this.audio = {}
        await this.createAudio(socket)
      } else if (!this.control) {
        logger.info('control stream connected')
        this.control = {}
        await this.createControl(socket)
      }
    })
    server.listen(port)
    this.server = server

    main.startScrcpy(deviceId, options.serialize())

    return this.readiness
      .ready(['video', 'audio', 'control'])
      .then(() => (this.started = true))
  })
  private async createVideo(socket: net.Socket) {
    const { options } = this
    const videoStream = socketToReadableStream(socket)

    const { stream, metadata } = await options.parseVideoStreamMetadata(
      videoStream
    )

    logger.info('video metadata', metadata)

    let codec: any = 0
    switch (metadata.codec) {
      case ScrcpyVideoCodecId.H264:
        codec = ScrcpyVideoCodecId.H264
        break
    }
    const renderer = new InsertableStreamVideoFrameRenderer()
    const decoder = new WebCodecsVideoDecoder({
      codec,
      renderer,
    })

    this.video = {
      stream: stream
        .pipeThrough(options.createMediaStreamTransformer())
        .pipeThrough(
          new InspectStream((packet) => {
            if (packet.type === 'configuration') {
              logger.info('video configuration', packet.data)
            }
          })
        ),
      metadata,
      decoder,
    }

    this.bindVideoEvent(renderer.element)

    this.readiness.signal('video')

    socket.on('close', () => this.emit('close'))
  }
  private bindVideoEvent(el: HTMLVideoElement) {
    logger.info('bind video event')

    el.addEventListener('pointerdown', (e) => {
      el.focus()
      this.injectTouch(el, e)
    })
    el.addEventListener('pointermove', (e) => this.injectTouch(el, e))
    el.addEventListener('pointerup', (e) => this.injectTouch(el, e))

    el.addEventListener('wheel', (e) => this.injectScroll(el, e))

    el.setAttribute('tabindex', '0')
    el.addEventListener('keydown', (e) => this.injectKeyCode(e))
    el.addEventListener('keyup', (e) => this.injectKeyCode(e))
  }
  private injectKeyCode(e: KeyboardEvent) {
    e.preventDefault()
    e.stopPropagation()

    const { type, code } = e

    let action: AndroidKeyEventAction
    switch (type) {
      case 'keydown':
        action = AndroidKeyEventAction.Down
        break
      case 'keyup':
        action = AndroidKeyEventAction.Up
        break
      default:
        throw new Error(`Unsupported event type: ${type}`)
    }

    const keyCode = AndroidKeyCode[code as keyof typeof AndroidKeyCode]

    if (this.control) {
      const controller: ScrcpyControlMessageWriter = this.control.controller
      controller.injectKeyCode({
        action,
        keyCode,
        repeat: 0,
        metaState: 0,
      })
    }
  }
  private injectScroll(el: HTMLVideoElement, e: WheelEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (this.control) {
      const controller: ScrcpyControlMessageWriter = this.control.controller
      controller.injectScroll({
        ...this.getPointer(el, e.clientX, e.clientY),
        scrollX: -e.deltaX / 100,
        scrollY: -e.deltaY / 100,
        buttons: 0,
      })
    }
  }
  private getPointer(el: HTMLVideoElement, clientX: number, clientY: number) {
    const screenWidth = el.width
    const screenHeight = el.height

    const rect = el.getBoundingClientRect()

    const videoRect = {
      width: 0,
      height: 0,
      x: 0,
      y: 0,
    }
    if (screenWidth / screenHeight < rect.width / rect.height) {
      videoRect.height = rect.height
      videoRect.width = videoRect.height * (screenWidth / screenHeight)
      videoRect.x = rect.x + (rect.width - videoRect.width) / 2
      videoRect.y = rect.y
    } else {
      videoRect.width = rect.width
      videoRect.height = videoRect.width * (screenHeight / screenWidth)
      videoRect.x = rect.x
      videoRect.y = rect.y + (rect.height - videoRect.height) / 2
    }

    const percentageX = clamp((clientX - videoRect.x) / videoRect.width, 0, 1)
    const percentageY = clamp((clientY - videoRect.y) / videoRect.height, 0, 1)

    const pointerX = percentageX * screenWidth
    const pointerY = percentageY * screenHeight

    return {
      screenWidth,
      screenHeight,
      pointerX,
      pointerY,
    }
  }
  private injectTouch(el: HTMLVideoElement, e: PointerEvent) {
    e.preventDefault()
    e.stopPropagation()

    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)

    const { type, clientX, clientY, button, buttons } = e

    let action: AndroidMotionEventAction
    switch (type) {
      case 'pointerdown':
        action = AndroidMotionEventAction.Down
        break
      case 'pointermove':
        if (buttons === 0) {
          action = AndroidMotionEventAction.HoverMove
        } else {
          action = AndroidMotionEventAction.Move
        }
        break
      case 'pointerup':
        action = AndroidMotionEventAction.Up
        break
      default:
        throw new Error(`Unsupported event type: ${type}`)
    }

    if (this.control) {
      const controller: ScrcpyControlMessageWriter = this.control.controller
      controller.injectTouch({
        action,
        pointerId: BigInt(e.pointerId),
        ...this.getPointer(el, clientX, clientY),
        pressure: buttons === 0 ? 0 : 1,
        actionButton: PointerEventButtonToAndroidButton[button],
        buttons,
      })
    }
  }
  private async createAudio(socket: net.Socket) {
    const { options } = this
    const audioStream = socketToReadableStream(socket)

    const metadata = await options.parseAudioStreamMetadata(audioStream)

    logger.info('audio metadata', metadata)

    if (metadata.type !== 'success') {
      this.audio = metadata
    } else {
      this.audio = {
        ...metadata,
        stream: metadata.stream.pipeThrough(
          options.createMediaStreamTransformer()
        ),
      }

      // eslint-disable-next-line
      const [recordStream, playbackStream] = this.audio.stream.tee()

      let player: any
      if (metadata.codec === ScrcpyAudioCodec.Raw) {
        logger.info('audio codec raw')
      } else if (metadata.codec === ScrcpyAudioCodec.Opus) {
        logger.info('audio codec opus')
        player = new Float32PcmPlayer(48000, 2)
        playbackStream
          .pipeThrough(
            new OpusStream({
              codec: metadata.codec.webCodecId,
              numberOfChannels: 2,
              sampleRate: 48000,
            })
          )
          .pipeTo(
            new WritableStream({
              write: (chunk) => {
                player.feed(chunk)
              },
            })
          )

        player.start()
      }
    }

    this.readiness.signal('audio')
  }
  private async createControl(socket: net.Socket) {
    const { options } = this
    const controlStream = socketToReadableWritablePair(socket)

    const controller = new ScrcpyControlMessageWriter(
      controlStream.writable.getWriter(),
      options
    )

    this.control = {
      controller,
    }

    this.readiness.signal('control')
  }
}

const PointerEventButtonToAndroidButton = [
  AndroidMotionEventButton.Primary,
  AndroidMotionEventButton.Tertiary,
  AndroidMotionEventButton.Secondary,
  AndroidMotionEventButton.Back,
  AndroidMotionEventButton.Forward,
]
