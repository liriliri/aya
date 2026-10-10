import * as $protobuf from "protobufjs";
import Long = require("long");

/** Namespace io. */
export namespace io {

    /** Namespace liriliri. */
    namespace liriliri {

        /** Namespace aya. */
        namespace aya {

            /**
             * Properties of a Request.
             * @deprecated Use io.liriliri.aya.Request.$Properties instead.
             */
            interface IRequest extends io.liriliri.aya.Request.$Properties {
            }

            /** Represents a Request. */
            class Request {

                /**
                 * Constructs a new Request.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: io.liriliri.aya.Request.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** Request id. */
                id: string;

                /** Request method. */
                method: string;

                /** Request params. */
                params: string;

                /**
                 * Creates a new Request instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns Request instance
                 */
                static create(properties: io.liriliri.aya.Request.$Shape): io.liriliri.aya.Request & io.liriliri.aya.Request.$Shape;
                static create(properties?: io.liriliri.aya.Request.$Properties): io.liriliri.aya.Request;

                /**
                 * Encodes the specified Request message. Does not implicitly {@link io.liriliri.aya.Request.verify|verify} messages.
                 * @param message Request message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: io.liriliri.aya.Request.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Request message, length delimited. Does not implicitly {@link io.liriliri.aya.Request.verify|verify} messages.
                 * @param message Request message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: io.liriliri.aya.Request.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Request message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {io.liriliri.aya.Request & io.liriliri.aya.Request.$Shape} Request
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): io.liriliri.aya.Request & io.liriliri.aya.Request.$Shape;

                /**
                 * Decodes a Request message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {io.liriliri.aya.Request & io.liriliri.aya.Request.$Shape} Request
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): io.liriliri.aya.Request & io.liriliri.aya.Request.$Shape;

                /**
                 * Verifies a Request message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a Request message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns Request
                 */
                static fromObject(object: { [k: string]: any }): io.liriliri.aya.Request;

                /**
                 * Creates a plain object from a Request message. Also converts values to other types if specified.
                 * @param message Request
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: io.liriliri.aya.Request, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this Request to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };

                /**
                 * Gets the type url for Request
                 * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
                 * @returns The type url
                 */
                static getTypeUrl(prefix?: string): string;
            }

            namespace Request {

                /** Properties of a Request. */
                interface $Properties {

                    /** Request id */
                    id?: (string|null);

                    /** Request method */
                    method?: (string|null);

                    /** Request params */
                    params?: (string|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a Request. */
                type $Shape = io.liriliri.aya.Request.$Properties;
            }

            /**
             * Properties of a Response.
             * @deprecated Use io.liriliri.aya.Response.$Properties instead.
             */
            interface IResponse extends io.liriliri.aya.Response.$Properties {
            }

            /** Represents a Response. */
            class Response {

                /**
                 * Constructs a new Response.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: io.liriliri.aya.Response.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** Response id. */
                id: string;

                /** Response result. */
                result: string;

                /**
                 * Creates a new Response instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns Response instance
                 */
                static create(properties: io.liriliri.aya.Response.$Shape): io.liriliri.aya.Response & io.liriliri.aya.Response.$Shape;
                static create(properties?: io.liriliri.aya.Response.$Properties): io.liriliri.aya.Response;

                /**
                 * Encodes the specified Response message. Does not implicitly {@link io.liriliri.aya.Response.verify|verify} messages.
                 * @param message Response message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: io.liriliri.aya.Response.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Response message, length delimited. Does not implicitly {@link io.liriliri.aya.Response.verify|verify} messages.
                 * @param message Response message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: io.liriliri.aya.Response.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Response message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {io.liriliri.aya.Response & io.liriliri.aya.Response.$Shape} Response
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): io.liriliri.aya.Response & io.liriliri.aya.Response.$Shape;

                /**
                 * Decodes a Response message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {io.liriliri.aya.Response & io.liriliri.aya.Response.$Shape} Response
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): io.liriliri.aya.Response & io.liriliri.aya.Response.$Shape;

                /**
                 * Verifies a Response message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a Response message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns Response
                 */
                static fromObject(object: { [k: string]: any }): io.liriliri.aya.Response;

                /**
                 * Creates a plain object from a Response message. Also converts values to other types if specified.
                 * @param message Response
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: io.liriliri.aya.Response, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this Response to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };

                /**
                 * Gets the type url for Response
                 * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
                 * @returns The type url
                 */
                static getTypeUrl(prefix?: string): string;
            }

            namespace Response {

                /** Properties of a Response. */
                interface $Properties {

                    /** Response id */
                    id?: (string|null);

                    /** Response result */
                    result?: (string|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a Response. */
                type $Shape = io.liriliri.aya.Response.$Properties;
            }
        }
    }
}
