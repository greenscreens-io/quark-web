/*
 * Copyright (C) 2015, 2022 Green Screens Ltd.
 */

/*
 * Simulate NoedJS Buffer, simple
 */
export default class Buffer {

	static from(value, type) {
		switch (type) {
			case 'base64':
				return Buffer.fromBase64(value);
			case 'hex':
				return Buffer.fromHex(value);
		}
		return value;
	}

	static to(value, type) {
		switch (type) {
			case 'base64':
				return Buffer.toBase64(value);
			case 'hex':
				return Buffer.toHex(value);
		}
		return value;
	}

	static fromHex(value) {

		const arry = [];

		for (let i = 0; i < value.length; i += 2) {
			arry.push(parseInt("0x" + value.substr(i, 2), 16));
		}

		return new Uint8Array(arry);
	}

	static fromBase64(value) {

		const strbin = atob(value);
		const buffer = new ArrayBuffer(strbin.length);
		const bufView = new Uint8Array(buffer);

		for (let i = 0, strLen = strbin.length; i < strLen; i++) {
			bufView[i] = strbin.charCodeAt(i);
		}

		return bufView;
	}

	static toHex(buffer) {
		return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
	}

	static toBase64(buffer) {
		return btoa(new Uint8Array(buffer));
	}

}
