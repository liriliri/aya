/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-mixed-operators, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars, default-case, jsdoc/require-param*/
import $protobuf from "protobufjs/minimal.js";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;
const $Object = $util.global.Object, $undefined = $util.global.undefined, $Error = $util.global.Error, $RangeError = $util.global.RangeError, $TypeError = $util.global.TypeError, $String = $util.global.String;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const io = $root.io = (() => {

    /**
     * Namespace io.
     * @exports io
     * @namespace
     */
    const io = {};

    io.liriliri = (function() {

        /**
         * Namespace liriliri.
         * @memberof io
         * @namespace
         */
        const liriliri = {};

        liriliri.aya = (function() {

            /**
             * Namespace aya.
             * @memberof io.liriliri
             * @namespace
             */
            const aya = {};

            aya.Request = (function() {

                /**
                 * Properties of a Request.
                 * @typedef {Object} io.liriliri.aya.Request.$Properties
                 * @property {string|null} [id] Request id
                 * @property {string|null} [method] Request method
                 * @property {string|null} [params] Request params
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a Request.
                 * @memberof io.liriliri.aya
                 * @interface IRequest
                 * @augments io.liriliri.aya.Request.$Properties
                 * @deprecated Use io.liriliri.aya.Request.$Properties instead.
                 */

                /**
                 * Shape of a Request.
                 * @typedef {io.liriliri.aya.Request.$Properties} io.liriliri.aya.Request.$Shape
                 */

                /**
                 * Constructs a new Request.
                 * @memberof io.liriliri.aya
                 * @classdesc Represents a Request.
                 * @constructor
                 * @param {io.liriliri.aya.Request.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const Request = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * Request id.
                 * @member {string} id
                 * @memberof io.liriliri.aya.Request
                 * @instance
                 */
                Request.prototype.id = "";

                /**
                 * Request method.
                 * @member {string} method
                 * @memberof io.liriliri.aya.Request
                 * @instance
                 */
                Request.prototype.method = "";

                /**
                 * Request params.
                 * @member {string} params
                 * @memberof io.liriliri.aya.Request
                 * @instance
                 */
                Request.prototype.params = "";

                /**
                 * Creates a new Request instance using the specified properties.
                 * @function create
                 * @memberof io.liriliri.aya.Request
                 * @static
                 * @param {io.liriliri.aya.Request.$Properties=} [properties] Properties to set
                 * @returns {io.liriliri.aya.Request} Request instance
                 * @type {{
                 *   (properties: io.liriliri.aya.Request.$Shape): io.liriliri.aya.Request & io.liriliri.aya.Request.$Shape;
                 *   (properties?: io.liriliri.aya.Request.$Properties): io.liriliri.aya.Request;
                 * }}
                 */
                Request.create = function(properties) {
                    return new Request(properties);
                };

                /**
                 * Encodes the specified Request message. Does not implicitly {@link io.liriliri.aya.Request.verify|verify} messages.
                 * @function encode
                 * @memberof io.liriliri.aya.Request
                 * @static
                 * @param {io.liriliri.aya.Request.$Properties} message Request message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Request.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id") && message.id !== "")
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
                    if (message.method != null && $Object.hasOwnProperty.call(message, "method") && message.method !== "")
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.method);
                    if (message.params != null && $Object.hasOwnProperty.call(message, "params") && message.params !== "")
                        writer.uint32(/* id 3, wireType 2 =*/26).string(message.params);
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified Request message, length delimited. Does not implicitly {@link io.liriliri.aya.Request.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof io.liriliri.aya.Request
                 * @static
                 * @param {io.liriliri.aya.Request.$Properties} message Request message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Request.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a Request message from the specified reader or buffer.
                 * @function decode
                 * @memberof io.liriliri.aya.Request
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {io.liriliri.aya.Request & io.liriliri.aya.Request.$Shape} Request
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Request.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.io.liriliri.aya.Request();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 1: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.id = value;
                                else
                                    delete message.id;
                                continue;
                            }
                        case 2: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.method = value;
                                else
                                    delete message.method;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.params = value;
                                else
                                    delete message.params;
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a Request message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof io.liriliri.aya.Request
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {io.liriliri.aya.Request & io.liriliri.aya.Request.$Shape} Request
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Request.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Request message.
                 * @function verify
                 * @memberof io.liriliri.aya.Request
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Request.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                        if (!$util.isString(message.id))
                            return "id: string expected";
                    if (message.method != null && $Object.hasOwnProperty.call(message, "method"))
                        if (!$util.isString(message.method))
                            return "method: string expected";
                    if (message.params != null && $Object.hasOwnProperty.call(message, "params"))
                        if (!$util.isString(message.params))
                            return "params: string expected";
                    return null;
                };

                /**
                 * Creates a Request message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof io.liriliri.aya.Request
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {io.liriliri.aya.Request} Request
                 */
                Request.fromObject = function (object, _depth) {
                    if (object instanceof $root.io.liriliri.aya.Request)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".io.liriliri.aya.Request: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.io.liriliri.aya.Request();
                    if (object.id != null)
                        if (typeof object.id !== "string" || object.id.length)
                            message.id = $String(object.id);
                    if (object.method != null)
                        if (typeof object.method !== "string" || object.method.length)
                            message.method = $String(object.method);
                    if (object.params != null)
                        if (typeof object.params !== "string" || object.params.length)
                            message.params = $String(object.params);
                    return message;
                };

                /**
                 * Creates a plain object from a Request message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof io.liriliri.aya.Request
                 * @static
                 * @param {io.liriliri.aya.Request} message Request
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                Request.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults) {
                        object.id = "";
                        object.method = "";
                        object.params = "";
                    }
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                        object.id = message.id;
                    if (message.method != null && $Object.hasOwnProperty.call(message, "method"))
                        object.method = message.method;
                    if (message.params != null && $Object.hasOwnProperty.call(message, "params"))
                        object.params = message.params;
                    return object;
                };

                /**
                 * Converts this Request to JSON.
                 * @function toJSON
                 * @memberof io.liriliri.aya.Request
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                Request.prototype.toJSON = function() {
                    return Request.toObject(this, $protobuf.util.toJSONOptions);
                };

                /**
                 * Gets the type url for Request
                 * @function getTypeUrl
                 * @memberof io.liriliri.aya.Request
                 * @static
                 * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
                 * @returns {string} The type url
                 */
                Request.getTypeUrl = function(prefix) {
                    if (prefix === $undefined)
                        prefix = "type.googleapis.com";
                    return prefix + "/io.liriliri.aya.Request";
                };

                return Request;
            })();

            aya.Response = (function() {

                /**
                 * Properties of a Response.
                 * @typedef {Object} io.liriliri.aya.Response.$Properties
                 * @property {string|null} [id] Response id
                 * @property {string|null} [result] Response result
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a Response.
                 * @memberof io.liriliri.aya
                 * @interface IResponse
                 * @augments io.liriliri.aya.Response.$Properties
                 * @deprecated Use io.liriliri.aya.Response.$Properties instead.
                 */

                /**
                 * Shape of a Response.
                 * @typedef {io.liriliri.aya.Response.$Properties} io.liriliri.aya.Response.$Shape
                 */

                /**
                 * Constructs a new Response.
                 * @memberof io.liriliri.aya
                 * @classdesc Represents a Response.
                 * @constructor
                 * @param {io.liriliri.aya.Response.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const Response = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * Response id.
                 * @member {string} id
                 * @memberof io.liriliri.aya.Response
                 * @instance
                 */
                Response.prototype.id = "";

                /**
                 * Response result.
                 * @member {string} result
                 * @memberof io.liriliri.aya.Response
                 * @instance
                 */
                Response.prototype.result = "";

                /**
                 * Creates a new Response instance using the specified properties.
                 * @function create
                 * @memberof io.liriliri.aya.Response
                 * @static
                 * @param {io.liriliri.aya.Response.$Properties=} [properties] Properties to set
                 * @returns {io.liriliri.aya.Response} Response instance
                 * @type {{
                 *   (properties: io.liriliri.aya.Response.$Shape): io.liriliri.aya.Response & io.liriliri.aya.Response.$Shape;
                 *   (properties?: io.liriliri.aya.Response.$Properties): io.liriliri.aya.Response;
                 * }}
                 */
                Response.create = function(properties) {
                    return new Response(properties);
                };

                /**
                 * Encodes the specified Response message. Does not implicitly {@link io.liriliri.aya.Response.verify|verify} messages.
                 * @function encode
                 * @memberof io.liriliri.aya.Response
                 * @static
                 * @param {io.liriliri.aya.Response.$Properties} message Response message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Response.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id") && message.id !== "")
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
                    if (message.result != null && $Object.hasOwnProperty.call(message, "result") && message.result !== "")
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.result);
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified Response message, length delimited. Does not implicitly {@link io.liriliri.aya.Response.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof io.liriliri.aya.Response
                 * @static
                 * @param {io.liriliri.aya.Response.$Properties} message Response message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Response.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a Response message from the specified reader or buffer.
                 * @function decode
                 * @memberof io.liriliri.aya.Response
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {io.liriliri.aya.Response & io.liriliri.aya.Response.$Shape} Response
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Response.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.io.liriliri.aya.Response();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 1: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.id = value;
                                else
                                    delete message.id;
                                continue;
                            }
                        case 2: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.result = value;
                                else
                                    delete message.result;
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a Response message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof io.liriliri.aya.Response
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {io.liriliri.aya.Response & io.liriliri.aya.Response.$Shape} Response
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Response.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Response message.
                 * @function verify
                 * @memberof io.liriliri.aya.Response
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Response.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                        if (!$util.isString(message.id))
                            return "id: string expected";
                    if (message.result != null && $Object.hasOwnProperty.call(message, "result"))
                        if (!$util.isString(message.result))
                            return "result: string expected";
                    return null;
                };

                /**
                 * Creates a Response message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof io.liriliri.aya.Response
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {io.liriliri.aya.Response} Response
                 */
                Response.fromObject = function (object, _depth) {
                    if (object instanceof $root.io.liriliri.aya.Response)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".io.liriliri.aya.Response: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.io.liriliri.aya.Response();
                    if (object.id != null)
                        if (typeof object.id !== "string" || object.id.length)
                            message.id = $String(object.id);
                    if (object.result != null)
                        if (typeof object.result !== "string" || object.result.length)
                            message.result = $String(object.result);
                    return message;
                };

                /**
                 * Creates a plain object from a Response message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof io.liriliri.aya.Response
                 * @static
                 * @param {io.liriliri.aya.Response} message Response
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                Response.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults) {
                        object.id = "";
                        object.result = "";
                    }
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                        object.id = message.id;
                    if (message.result != null && $Object.hasOwnProperty.call(message, "result"))
                        object.result = message.result;
                    return object;
                };

                /**
                 * Converts this Response to JSON.
                 * @function toJSON
                 * @memberof io.liriliri.aya.Response
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                Response.prototype.toJSON = function() {
                    return Response.toObject(this, $protobuf.util.toJSONOptions);
                };

                /**
                 * Gets the type url for Response
                 * @function getTypeUrl
                 * @memberof io.liriliri.aya.Response
                 * @static
                 * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
                 * @returns {string} The type url
                 */
                Response.getTypeUrl = function(prefix) {
                    if (prefix === $undefined)
                        prefix = "type.googleapis.com";
                    return prefix + "/io.liriliri.aya.Response";
                };

                return Response;
            })();

            return aya;
        })();

        return liriliri;
    })();

    return io;
})();

export {
  $root as default
};
