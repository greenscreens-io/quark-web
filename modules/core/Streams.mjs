/*
 * Copyright (C) 2015, 2022 Green Screens Ltd.
 */

/**
 * Browser native compression
 */
export default class Streams {

	static get isAvailable() {
		return typeof CompressionStream !== 'undefined' &&
			typeof DecompressionStream !== 'undefined';
	}

	static convert(data) {
		if (data instanceof Uint8Array) return data;
		if (data instanceof ArrayBuffer) return new Uint8Array(data);
		if (typeof data === 'string' ) return new TextEncoder().encode(data);
		if (Array.isArray(data)) return new Uint8Array(data);
		return this.convert(JSON.stringify(data));
	}

	static #stream(data, stream, decompress) {
		const byteArray = this.convert(data);
		if (decompress && !this.isCompressed(byteArray)) return data;
		const writer = stream.writable.getWriter();
		writer.write(byteArray);
		writer.close();
		return new Response(stream.readable);
	}

	/**
	 * Compress to gzip format
	 * @param {*} data 
	 * @param {*} encoding gzip | deflate (zlib)
	 * @returns {Response} 
	 */	
	static compress(data, encoding = 'gzip') {
		const stream = new CompressionStream(encoding);
		return this.#stream(data, stream, false);
	}

	/**
	 * Decompress from gzip format
	 * @param {*} data 
	 * @param {*} encoding gzip | deflate (zlib)
	 * @returns {Response} 
	 */
	static decompress(data, encoding = 'gzip') {
		const stream = new DecompressionStream(encoding);
		return this.#stream(data, stream, true);
	}

	/**
	 * If  1st 2 bytes mathes gzip/deflate header signature
	 * @param {ArrayBuffer|Uint8Array} data 
	 */
	static isCompressed(data) {
		const me = this;
		data = me.convert(data);
		return me.isGzip(data) || me.isZlib(data);
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
		const me = this;
		data = typeof data === 'string' ? data.trim() : me.convert(data);
		const first = data.at(0);
		const last = data.at(data.length - 1);		
		return me.#isJsonArray(first, last) || me.#isJsonObj(first, last);
	}

	static #isJsonObj(first, last) {
		return (first === '{' || first === 123)  && (last === '}' || last === 125);
	}

	static #isJsonArray(first, last) {
		return (first === '[' || first === 91)  && (last === ']' || last === 93);
	}
}
