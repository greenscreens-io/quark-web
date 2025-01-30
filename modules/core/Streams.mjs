/*
 * Copyright (C) 2015, 2022 Green Screens Ltd.
 */

import QuarkBuffer from './Buffer.mjs';

/**
 * Browser native compression
 */
export default class QuarkStreams {

	static get isAvailable() {
		return typeof CompressionStream !== 'undefined' &&
			typeof DecompressionStream !== 'undefined';
	}

	/**
	 * Stream header GS[version(5)][type(0|1|2|3)][len]
	 * type: 0 - utf8 binary string, 1 - compressed, 2 - encrypted, 3 - 1 & 2
	 * new Uint8Array([71, 83, 5, type, 0, 0, 0, 0]);
	 * @param {Uint8Array} data
	 * @returns {Uint8Array}
	 */
	static #toGS(raw, encrypted = false, compressed = false) {
		if (!(raw instanceof Uint8Array)) return raw;
		const type = QuarkStreams.#dataType(encrypted, compressed);

		const data = new Uint8Array(8 + raw.length);
		const dv = new DataView(data.buffer);
		dv.setUint8(0, 71);
		dv.setUint8(1, 83);
		dv.setUint8(2, 5);
		dv.setUint8(3, type);
		dv.setUint32(4, raw.length);
		data.set(raw, 8);
		return data;
	}

	/**
	 * Encode binary message to GS binary format
	 * @param {*} raw 
	 * @param {*} security 
	 */
	static async wrap(raw, security) {
		const me = QuarkStreams;
		raw = me.toBinary(raw);
		raw = await me.compressOrDefault(raw);
		raw = await security.encrypt(raw);
		raw = me.#toGS(raw, security.isValid, me.isAvailable);
		/*
		if (globalThis.QUARK_DEBUG) {
			console.log('DEBUG: Output :', QuarkBuffer.toHex(raw));
		}
		*/
		return raw;
	}

	/**
	 * Decode binary message from GS binary format
	 * @param {*} raw 
	 * @param {*} security 
	 */
	static async unwrap(raw, security, challenge) {

		if (raw instanceof Uint8Array) raw = raw.buffer;

		/*
		if (globalThis.QUARK_DEBUG) {
			console.log('DEBUG: Input :', QuarkBuffer.toHex(raw));
		}
		*/
		const me = QuarkStreams;
		const dv = new DataView(raw);
		const isGS = me.#isGS(dv);

		raw = me.toBinary(raw);
		if (!isGS) return raw;

		const type = dv.getUint8(3);
		const len = dv.getUint32(4);

		if (dv.byteLength !== len + 8) return raw;

		raw = raw.slice(8);

		const isCompress = me.isCompressFlag(type);
		const isEncrypt = me.isEncryptFlag(type);
		const isApi = me.isApiFlag(type);

		let api = null;
		if (isApi) {
			const encLen = dv.getUint32(8);
			const verLen = dv.getUint32(8 + 4 + encLen);
			const sgnLen = dv.getUint32(8 + 4 + encLen + 4 + verLen);

			api = {
				challenge: challenge,
				keyEnc: (raw.slice(4, 4 + encLen)),
				keyVer: (raw.slice(4 + encLen + 4, 4 + encLen + 4 + verLen)),
				signature: (raw.slice(4 + encLen + 4 + verLen + 4, 4 + encLen + 4 + verLen + 4 + sgnLen))
			};

			await security.init(api);
			raw = raw.slice((4 * 3) + encLen + verLen + sgnLen);
		}


		if (isEncrypt) {
			raw = await security?.decrypt(raw);
		}

		if (isCompress) {
			raw = await me.decompress(raw).arrayBuffer();
		}

		raw = me.toBinary(raw);
		if (!me.isJson(raw)) throw new Error('Invalid response');

		return JSON.parse(QuarkBuffer.toText(raw));
	}

	/**
	 * Check if DataView id GS data format
	 * @param {*} dv 
	 * @returns 
	 */
	static #isGS(dv) {
		return dv.byteLength > 8 && dv.getUint16(0) === 18259 && dv.getUint8(2) === 5;
	}

	static isCompressFlag(type) {
		return (type & 1) === 1;
	}

	static isEncryptFlag(type) {
		return (type & 2) === 2;
	}

	static isApiFlag(type) {
		return (type & 4) === 4;
	}

	static #dataType(isEncrypt, isCompress) {
		const type = isCompress ? 1 : 0;
		return type | (isEncrypt ? 2 : 0);
	}

	static #stream(data, stream) {
		const me = QuarkStreams;
		const byteArray = me.toBinary(data);
		const writer = stream.writable.getWriter();
		writer.write(byteArray);
		writer.close();
		return new Response(stream.readable);
	}

	/**
	 * If compression available, compress, 
	 * else return original value
	 * @param {*} data 
	 * @param {*} encoding 
	 */
	static async compressOrDefault(data, encoding = 'gzip') {
		const me = QuarkStreams;
		if (!me.isAvailable) return data;
		try {
			const raw = await me.compress(data, encoding).arrayBuffer();
			return me.toBinary(raw);
		} catch (error) {
			console.error('Compression failed:', error);
			throw error;
		}
	}

	/**
	 * If decompression available, decompress, 
	 * else return original value
	 * @param {*} data 
	 * @param {*} encoding 
	 */
	static async decompressOrDefault(data, encoding = 'gzip') {
		const me = QuarkStreams;
		if (!me.isAvailable) return data;
		try {
			const raw = await me.decompress(data, encoding).arrayBuffer();
			return me.toBinary(raw);
		} catch (error) {
			console.error('Decompression failed:', error);
			throw error;
		}
	}

	/**
	 * Compress to gzip format
	 * @param {*} data 
	 * @param {*} encoding gzip | deflate (zlib)
	 * @returns {Response} 
	 */
	static compress(data, encoding = 'gzip') {
		const stream = new CompressionStream(encoding);
		return QuarkStreams.#stream(data, stream);
	}

	/**
	 * Decompress from gzip format
	 * @param {*} data 
	 * @param {*} encoding gzip | deflate (zlib)
	 * @returns {Response} 
	 */
	static decompress(data, encoding = 'gzip') {
		const stream = new DecompressionStream(encoding);
		return QuarkStreams.#stream(data, stream);
	}

	static toBinary(data) {
		if (data instanceof Uint8Array) return data;
		if (data instanceof ArrayBuffer) return new Uint8Array(data);
		if (typeof data === 'string') return QuarkBuffer.fromText(data);
		return QuarkStreams.toBinary(JSON.stringify(data));
	}

	/**
	 * If  1st 2 bytes mathes gzip/deflate header signature
	 * @param {ArrayBuffer|Uint8Array} data 
	 */
	static isCompressed(data) {
		const me = QuarkStreams;
		data = me.toBinary(data);
		return me.isGzip(data); // || me.isZlib(data);
	}

	/**
	 * If  1st 3 bytes matches gzip header signature
	 * 
	 * zlib
	 * 1F 8B 08
	 * 31 139 8
	 * 
	 * @param {ArrayBuffer|Uint8Array} data 
	 */
	static isGzip(data) {
		return data.at(0) === 31 && data.at(1) === 139 && data.at(2) === 8;
	}

	/**
	 * If  1st 2 bytes matches deflate (zlib) header signature
	 * 
	 * deflate
	 * 78  (01, 5e,9c, da) 
	 * 120 (1, 94, 156, 218)
	 * @param {ArrayBuffer|Uint8Array} data 
	 */
	static isZlib(data) {
		return data.at(0) === 120 && [1, 94, 156, 218].indexOf(data.at(1)) > -1;
	}

	static isJson(data) {
		const me = QuarkStreams;
		data = typeof data === 'string' ? data.trim() : me.toBinary(data);
		const first = data.at(0);
		const last = data.at(data.length - 1);
		return me.#isJsonArray(first, last) || me.#isJsonObj(first, last);
	}

	static #isJsonObj(first, last) {
		return (first === '{' || first === 123) && (last === '}' || last === 125);
	}

	static #isJsonArray(first, last) {
		return (first === '[' || first === 91) && (last === ']' || last === 93);
	}
}
