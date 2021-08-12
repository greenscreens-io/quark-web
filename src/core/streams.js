/*
 * Copyright (C) 2015, 2020  Green Screens Ltd.
 */

/**
 * Browser native compression
 */
class Streams {

	static get isAvailable() {
		return typeof CompressionStream !== 'undefined' &&
				typeof DecompressionStream !== 'undefined';
	}

	static async compress(text, encoding = 'gzip') {
		const byteArray = new TextEncoder().encode(text);
		const cs = new CompressionStream(encoding);
		const writer = cs.writable.getWriter();
		writer.write(byteArray);
		writer.close();
		return new Response(cs.readable).arrayBuffer();
	}

	static async decompress(byteArray, encoding = 'gzip') {
		const cs = new DecompressionStream(encoding);
		const writer = cs.writable.getWriter();
		writer.write(byteArray);
		writer.close();
		const arrayBuffer = await new Response(cs.readable).arrayBuffer();
		return new TextDecoder().decode(arrayBuffer);
	}

}
