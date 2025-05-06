import {
  annexBSplitNalu,
  h264SearchConfiguration,
  ScrcpyAudioCodec,
  ScrcpyMediaStreamDataPacket,
  ScrcpyMediaStreamPacket,
  ScrcpyVideoCodecId,
  ScrcpyVideoStreamMetadata,
} from '@yume-chan/scrcpy'
import { ArrayBufferTarget, Muxer as WebMMuxer } from 'webm-muxer'
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
const MatroskaVideoCodecNameMap: Record<ScrcpyVideoCodecId, string> = {
  [ScrcpyVideoCodecId.H264]: 'V_MPEG4/ISO/AVC',
  [ScrcpyVideoCodecId.H265]: 'V_MPEGH/ISO/HEVC',
  [ScrcpyVideoCodecId.AV1]: 'V_AV1',
}

const MatroskaAudioCodecNameMap: Record<string, string> = {
  [ScrcpyAudioCodec.Raw.mimeType]: 'A_PCM/INT/LIT',
  [ScrcpyAudioCodec.Aac.mimeType]: 'A_AAC',
  [ScrcpyAudioCodec.Opus.mimeType]: 'A_OPUS',
}

// https://github.com/tango-adb/old-demo/blob/main/packages/demo/src/components/scrcpy/recorder.ts
export default class Recorder {
  running = false
  videoMetadata?: ScrcpyVideoStreamMetadata
  audioCodec?: ScrcpyAudioCodec
  private muxer?: WebMMuxer<ArrayBufferTarget>
  private videoCodecDescription?: Uint8Array
  private configurationWritten = false
  private _firstTimestamp = -1
  start() {
    if (!this.videoMetadata) {
      throw new Error('videoMetadata must be set')
    }

    this.running = true

    const options: ConstructorParameters<typeof WebMMuxer>[0] = {
      target: new ArrayBufferTarget(),
      type: 'matroska',
      firstTimestampBehavior: 'permissive',
      video: {
        codec: MatroskaVideoCodecNameMap[this.videoMetadata.codec!],
        width: this.videoMetadata.width ?? 0,
        height: this.videoMetadata.height ?? 0,
      },
    }

    if (this.audioCodec) {
      options.audio = {
        codec: MatroskaAudioCodecNameMap[this.audioCodec.mimeType!],
        sampleRate: 48000,
        numberOfChannels: 2,
        bitDepth: this.audioCodec === ScrcpyAudioCodec.Raw ? 16 : undefined,
      }
    }

    this.muxer = new WebMMuxer(options as any)
  }
  stop() {
    if (!this.muxer) {
      return
    }

    this.muxer.finalize()!
    const buf = this.muxer.target.buffer

    this.muxer = undefined
    this.videoCodecDescription = undefined
    this.configurationWritten = false
    this.running = false
    this._firstTimestamp = -1

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
          this.configurationWritten = false
          break
      }
      return
    }

    if (!this.muxer) {
      return
    }

    this.addVideoChunk(packet)
  }
  addAudioPacket(packet: ScrcpyMediaStreamDataPacket) {
    this.addAudioChunk(packet)
  }
  private addVideoChunk(packet: ScrcpyMediaStreamDataPacket) {
    if (this._firstTimestamp === -1) {
      this._firstTimestamp = Number(packet.pts!)
    }

    const sample = h264StreamToAvcSample(packet.data)
    this.muxer!.addVideoChunkRaw(
      sample,
      packet.keyframe ? 'key' : 'delta',
      Number(packet.pts) - this._firstTimestamp,
      this.configurationWritten
        ? undefined
        : {
            decoderConfig: {
              codec: '',
              description: this.videoCodecDescription,
            },
          }
    )
    this.configurationWritten = true
  }
  private addAudioChunk(chunk: ScrcpyMediaStreamDataPacket) {
    if (this._firstTimestamp === -1) {
      return
    }

    const timestamp = Number(chunk.pts) - this._firstTimestamp
    if (timestamp < 0) {
      return
    }

    if (!this.muxer) {
      return
    }

    this.muxer.addAudioChunkRaw(chunk.data, 'key', timestamp)
  }
}
