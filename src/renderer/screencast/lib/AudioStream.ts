import { TransformStream } from '@yume-chan/stream-extra'
import { ScrcpyMediaStreamPacket } from '@yume-chan/scrcpy'
import log from 'share/common/log'

const logger = log('AudioStream')

export class OpusStream extends TransformStream<
  ScrcpyMediaStreamPacket,
  Float32Array
> {
  constructor(config: AudioDecoderConfig) {
    let decoder: AudioDecoder

    super({
      start(controller) {
        decoder = new AudioDecoder({
          error(error) {
            logger.error('audio decoder error', error)
            controller.error(error)
          },
          output(output) {
            const options: AudioDataCopyToOptions = {
              format: 'f32',
              planeIndex: 0,
            }
            const buffer = new Float32Array(
              output.allocationSize(options) / Float32Array.BYTES_PER_ELEMENT
            )
            output.copyTo(buffer, options)
            controller.enqueue(buffer)
          },
        })
        decoder.configure(config)
      },
      transform(chunk: any) {
        switch (chunk.type) {
          case 'data':
            if (chunk.data.length === 0) {
              break
            }
            decoder.decode(
              new EncodedAudioChunk({
                type: 'key',
                timestamp: 0,
                data: chunk.data,
              })
            )
        }
      },
      async flush() {
        await decoder.flush()
      },
    })
  }
}
