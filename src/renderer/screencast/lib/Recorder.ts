import {
  annexBSplitNalu,
  h264SearchConfiguration,
  ScrcpyAudioCodec,
  ScrcpyMediaStreamDataPacket,
  ScrcpyMediaStreamPacket,
  ScrcpyVideoCodecId,
  ScrcpyVideoStreamMetadata,
} from '@yume-chan/scrcpy'
import {
  AudioCodec,
  BufferTarget,
  EncodedAudioPacketSource,
  EncodedPacket,
  EncodedVideoPacketSource,
  MkvOutputFormat,
  Output,
  VideoCodec,
} from 'mediabunny'
import log from 'share/common/log'

const logger = log('Recorder')

// https://ffmpeg.org/doxygen/0.11/avc_8c-source.html#l00106
function h264ConfigurationToAvcDecoderConfigurationRecord(
  sequenceParameterSet: Uint8Array,
  pictureParameterSet: Uint8Array
) {
  const buffer = new Uint8Array(
    11 + sequenceParameterSet.byteLength + pictureParameterSet.byteLength
  )
  buffer[0] = 1
  buffer[1] = sequenceParameterSet[1]
  buffer[2] = sequenceParameterSet[2]
  buffer[3] = sequenceParameterSet[3]
  buffer[4] = 0xff
  buffer[5] = 0xe1
  buffer[6] = sequenceParameterSet.byteLength >> 8
  buffer[7] = sequenceParameterSet.byteLength & 0xff
  buffer.set(sequenceParameterSet, 8)
  buffer[8 + sequenceParameterSet.byteLength] = 1
  buffer[9 + sequenceParameterSet.byteLength] =
    pictureParameterSet.byteLength >> 8
  buffer[10 + sequenceParameterSet.byteLength] =
    pictureParameterSet.byteLength & 0xff
  buffer.set(pictureParameterSet, 11 + sequenceParameterSet.byteLength)
  return buffer
}

function h264StreamToAvcSample(buffer: Uint8Array) {
  const nalUnits: Uint8Array[] = []
  let totalLength = 0

  for (const unit of annexBSplitNalu(buffer)) {
    nalUnits.push(unit)
    totalLength += unit.byteLength + 4
  }

  const sample = new Uint8Array(totalLength)
  let offset = 0
  for (const nalu of nalUnits) {
    sample[offset] = nalu.byteLength >> 24
    sample[offset + 1] = nalu.byteLength >> 16
    sample[offset + 2] = nalu.byteLength >> 8
    sample[offset + 3] = nalu.byteLength & 0xff
    sample.set(nalu, offset + 4)
    offset += 4 + nalu.byteLength
  }
  return sample
}

// https://github.com/FFmpeg/FFmpeg/blob/adb5f7b41faf354a3e0bf722f44aeb230aefa310/libavformat/matroska.c
const MatroskaVideoCodecNameMap: Record<ScrcpyVideoCodecId, VideoCodec> = {
  [ScrcpyVideoCodecId.H264]: 'avc',
  [ScrcpyVideoCodecId.H265]: 'hevc',
  [ScrcpyVideoCodecId.AV1]: 'av1',
}

const MatroskaAudioCodecNameMap: Record<string, AudioCodec> = {
  [ScrcpyAudioCodec.Raw.mimeType]: 'pcm-s16',
  [ScrcpyAudioCodec.Aac.mimeType]: 'aac',
  [ScrcpyAudioCodec.Opus.mimeType]: 'opus',
}

// https://github.com/tango-adb/old-demo/blob/main/packages/demo/src/components/scrcpy/recorder.ts
export default class Recorder {
  running = false
  videoMetadata?: ScrcpyVideoStreamMetadata
  audioCodec?: ScrcpyAudioCodec
  private output?: Output<MkvOutputFormat, BufferTarget>
  private videoSource?: EncodedVideoPacketSource
  private audioSource?: EncodedAudioPacketSource
  private outputReady?: Promise<void>
  private writeQueue: Promise<void> = Promise.resolve()
  private videoCodecDescription?: Uint8Array
  private videoCodecString?: string
  private configurationWritten = false
  private audioConfigurationWritten = false
  private _firstTimestamp = -1
  private pendingVideo?: {
    data: Uint8Array
    type: 'key' | 'delta'
    timestamp: number
  }
  private pendingAudio?: { data: Uint8Array; timestamp: number }
  private lastVideoDuration = 1 / 30
  private lastAudioDuration = 1024 / 48000

  start() {
    if (!this.videoMetadata) {
      throw new Error('videoMetadata must be set')
    }

    this.running = true
    this.writeQueue = Promise.resolve()
    this.configurationWritten = false
    this.audioConfigurationWritten = false
    this._firstTimestamp = -1
    this.pendingVideo = undefined
    this.pendingAudio = undefined
    this.lastVideoDuration = 1 / 30
    this.lastAudioDuration = 1024 / 48000

    const target = new BufferTarget()
    const output = new Output({ format: new MkvOutputFormat(), target })
    const videoSource = new EncodedVideoPacketSource(
      MatroskaVideoCodecNameMap[this.videoMetadata.codec]
    )
    output.addVideoTrack(videoSource)
    this.output = output
    this.videoSource = videoSource

    if (this.audioCodec) {
      const audioSource = new EncodedAudioPacketSource(
        MatroskaAudioCodecNameMap[this.audioCodec.mimeType]
      )
      output.addAudioTrack(audioSource)
      this.audioSource = audioSource
    }

    this.outputReady = output.start()
  }
  async stop() {
    const output = this.output
    if (!output) {
      return
    }

    if (this.pendingVideo) {
      this.enqueueVideoPacket(this.pendingVideo, this.lastVideoDuration)
    }
    if (this.pendingAudio) {
      this.enqueueAudioPacket(this.pendingAudio, this.lastAudioDuration)
    }

    await this.writeQueue
    await output.finalize()
    const buf = output.target.buffer ?? undefined

    this.output = undefined
    this.videoSource = undefined
    this.audioSource = undefined
    this.outputReady = undefined
    this.videoCodecDescription = undefined
    this.videoCodecString = undefined
    this.configurationWritten = false
    this.audioConfigurationWritten = false
    this.running = false
    this._firstTimestamp = -1
    this.pendingVideo = undefined
    this.pendingAudio = undefined

    return buf
  }
  addVideoPacket(packet: ScrcpyMediaStreamPacket) {
    if (!this.videoMetadata) {
      throw new Error('videoMetadata must be set')
    }

    if (packet.type === 'configuration') {
      logger.info('video configuration packet')
      switch (this.videoMetadata.codec) {
        case ScrcpyVideoCodecId.H264:
          const { sequenceParameterSet, pictureParameterSet } =
            h264SearchConfiguration(packet.data)
          this.videoCodecDescription =
            h264ConfigurationToAvcDecoderConfigurationRecord(
              sequenceParameterSet,
              pictureParameterSet
            )
          this.videoCodecString = `avc1.${Array.from(
            this.videoCodecDescription.subarray(1, 4),
            (byte) => byte.toString(16).padStart(2, '0')
          ).join('')}`
          this.configurationWritten = false
          break
      }
      return
    }

    if (!this.videoSource || packet.pts === undefined) {
      return
    }

    const packetTimestamp = Number(packet.pts)
    if (this._firstTimestamp === -1) {
      this._firstTimestamp = packetTimestamp
    }
    const timestamp = (packetTimestamp - this._firstTimestamp) / 1_000_000
    const currentPacket = {
      data: h264StreamToAvcSample(packet.data),
      type: packet.keyframe ? ('key' as const) : ('delta' as const),
      timestamp,
    }

    if (this.pendingVideo) {
      const duration = timestamp - this.pendingVideo.timestamp
      if (duration > 0 && duration < 1) {
        this.lastVideoDuration = duration
      }
      this.enqueueVideoPacket(
        this.pendingVideo,
        duration > 0 ? duration : this.lastVideoDuration
      )
    }
    this.pendingVideo = currentPacket
  }
  addAudioPacket(packet: ScrcpyMediaStreamDataPacket) {
    if (!this.audioSource || packet.pts === undefined || this._firstTimestamp === -1) {
      return
    }

    const timestamp = (Number(packet.pts) - this._firstTimestamp) / 1_000_000
    if (timestamp < 0) {
      return
    }

    const currentPacket = { data: packet.data, timestamp }
    if (this.pendingAudio) {
      const duration = timestamp - this.pendingAudio.timestamp
      if (duration > 0 && duration < 1) {
        this.lastAudioDuration = duration
      }
      this.enqueueAudioPacket(
        this.pendingAudio,
        duration > 0 ? duration : this.lastAudioDuration
      )
    }

    this.pendingAudio = currentPacket
  }

  private enqueueVideoPacket(
    packet: { data: Uint8Array; type: 'key' | 'delta'; timestamp: number },
    duration: number
  ) {
    const source = this.videoSource
    if (!source) {
      return
    }
    const metadata = this.configurationWritten || !this.videoCodecDescription
      ? undefined
      : {
          decoderConfig: {
            codec: this.videoCodecString!,
            codedWidth: this.videoMetadata?.width,
            codedHeight: this.videoMetadata?.height,
            description: this.videoCodecDescription,
          },
        }
    this.configurationWritten = true
    this.enqueueWrite(() =>
      source.add(
        new EncodedPacket(
          packet.data,
          packet.type,
          packet.timestamp,
          duration
        ),
        metadata
      )
    )
  }

  private enqueueAudioPacket(
    packet: { data: Uint8Array; timestamp: number },
    duration: number
  ) {
    const source = this.audioSource
    if (!source || !this.audioCodec) {
      return
    }
    const metadata = this.audioConfigurationWritten
      ? undefined
      : {
          decoderConfig: {
            codec: this.audioCodec.webCodecId,
            sampleRate: 48000,
            numberOfChannels: 2,
          },
        }
    this.audioConfigurationWritten = true
    this.enqueueWrite(() =>
      source.add(
        new EncodedPacket(packet.data, 'key', packet.timestamp, duration),
        metadata
      )
    )
  }

  private enqueueWrite(write: () => Promise<void>) {
    this.writeQueue = this.writeQueue
      .then(async () => {
        await this.outputReady
        await write()
      })
      .catch((error) => {
        logger.error(error)
      })
  }
}
