/*
 * Copyright (C) 2015, 2020  Green Screens Ltd.
 */

/**
 * Security engine using Web Crypto API to encrypt / decrypt
 * messages between browser and server.
 *
 * Received RSA public key is signed and verified at the
 * browser side to prevent tampering
 */

class Security {

	constructor() {

		let me = this;
		me.VERSION = 0;
		me.encKEY = null;
		me.aesKEY = null;
		me.exportedAES = null;

		me.encoder = new TextEncoder();
		me.decoder = new TextDecoder();

	}

	/**
	 *  Use local challenge, to verify received data signature
	 *
	 *  @param {Object} cfg
	 *      Data received from server contins public key and signature
	 */
	getChallenge(cfg) {
		return [cfg.challenge || '', cfg.keyEnc || '', cfg.keyVer || ''].join('');
	}


	/**
	 * Create random bytes
	 *
	 * @param {int} size
	 *     length of data (required)
	 */
	getRandom(size) {
		let array = new Uint8Array(size);
		window.crypto.getRandomValues(array);
		return array;
	}

	/**
	* Create AES key for data encryption
	* @returns CryptoKey
	*/
	async generateAesKey() {
		let type = {
			name: "AES-CTR",
			length: 128
		};
		let mode = ["encrypt", "decrypt"];
		return window.crypto.subtle.generateKey(type, true, mode);
	}

	/**
	* Extract CryptoKey into RAW bytes
	* @param {CryptoKey} key
	* @returns Uin8Array
	*/
	async exportAesKey(key) {
		let buffer = await window.crypto.subtle.exportKey("raw", key);
		return new Uint8Array(buffer);
	}

	/**
	 * Import RSA key received from server
	 * Key is publicKey used to send encrypted AES key
	 *
	 * @param {String} key
	 *          PEM encoded key without headers,
	 *          flattened in a single line
	 *
	 * @param {Object} type
	 *          Crypto API key definition format
	 *
	 * @param {String} mode
	 *          Key usage 'encrypt' or 'decrypt'
	 */
	async importRsaKey(key, type, mode) {

		let binaryDerString = window.atob(key);
		let binaryDer = str2ab(binaryDerString);

		return window.crypto.subtle.importKey(
			"spki",
			binaryDer,
			type,
			true,
			[mode]
		);
	}

	/**
	 * Verify signature
	 *
	 * @param {CryptoKey}
	 *      Public key used for verification
	 *
	 * @param {ArrayBuffer} signature
	 *        Signature of received data
	 *
	 * @param {ArrayBuffer} challenge
	 *        Challenge to verify with signature (ts + pemENCDEC + pemVERSGN)
	 */
	async verify(key, signature, challenge) {

		let me = this;
		let binSignature = str2ab(atob(signature));
		let binChallenge = me.encoder.encode(challenge);

		let type = {
			name: "ECDSA",
			hash: {
				name: "SHA-384"
			}
		};

		return window.crypto.subtle.verify(
			type,
			key,
			binSignature,
			binChallenge
		);
	}

	/**
	 * Encrypt message with RSA key
	 *
	 * @param {String || ArrayBuffer} data
	 *        String or AraryBuffer to encrypt
	 */
	async encryptRSA(data) {

		let me = this;
		let encoded = data;

		if (typeof data === 'string') {
			encoded = me.encoder.encode(data);
		}

		return window.crypto.subtle.encrypt(
			"RSA-OAEP",
			me.encKEY,
			encoded
		);
	}

	/**
	 * Encrypt message with AES
	 */
	async encryptAesMessage(key, iv, data) {

		let encoded = this.encoder.encode(data);
		let type = {
			name: "AES-CTR",
			counter: iv,
			length: 128
		};

		return window.crypto.subtle.encrypt(type, key, encoded);
	}

	/**
	 * Decrypt AES encrypted message
	 */
	async decryptAesMessage(key, iv, data) {

		let databin = hex2ab(data);
		let ivbin = hex2ab(iv);

		let counter = new Uint8Array(ivbin);
		let dataArray = new Uint8Array(databin);
		let type = {
			name: "AES-CTR",
			counter: counter,
			length: 128
		};

		return window.crypto.subtle.decrypt(type, key, dataArray);
	}

	get isValid() {
		let me = this;
		return me.encKEY !== null && me.aesKEY !== null;
	}

	get isAvailable() {
		return window.crypto.subtle != null;
	}

	/********************************************************************/
	/*                   P U B L I C  F U N C T I O N S                 */
	/********************************************************************/

	/**
	 * Initialize encryption and verification keys
	 * Verifies data signatures to prevent tampering
	 */
	async init(cfg) {

		let me = this;

		if (!me.isAvailable) {
			console.log('Security mode not available, TLS protocol required.');
			return;
		}

		console.log('Security Initializing...');

		me.VERSION++;

		me.encKEY = await importRsaKey(cfg.keyEnc, {
			name: 'RSA-OAEP',
			hash: 'SHA-256'
		}, 'encrypt');

		me.aesKEY = await generateAesKey();
		me.exportedAES = await exportAesKey(aesKEY);

		let verKey = await importRsaKey(cfg.keyVer, {
			name: 'ECDSA',
			namedCurve: "P-384"
		}, 'verify');

		let status = await verify(verKey, cfg.signature, getChallenge(cfg || {}));

		if (!status) {
			me.encKEY = null;
			me.aesKEY = null;
			me.exportedAES = null;
			throw new Error('Signature invalid');
		}

		console.log('Security Initialized!');

	}

	/**
	 *  Ecnrypt received data in format {d:.., k:...}
	 * @param
	 * 		data  - string to encrypt
	 */
	async encrypt(data, bin) {

		let me = this;
		let iv = getRandom(16);
		let key = new Uint8Array(iv.length + me.exportedAES.length);

		key.set(iv);
		key.set(me.exportedAES, iv.length);

		let encryptedKey = await encryptRSA(key);
		let encryptedData = await encryptAesMessage(me.aesKEY, iv, data);

		if (bin === true) {
			return {
				d: encryptedData,
				k: encryptedKey
			};
		}

		return {
			d: buf2hex(encryptedData),
			k: buf2hex(encryptedKey)
		};

	}

	/**
	 * Decrypt received data in format {d:.., k:...}
	 *
	 * @param
	 * 		cfg  - data elements to decrypt
	 * 		cfg.d - aes encrypted server resposne
	 * 		cfg.k - aes IV used for masking
	 *
	 */
	async decrypt(cfg) {

		let me = this;
		let iv = cfg.iv;
		let data = cfg.d;

		let message = await decryptAesMessage(me.aesKEY, iv, data);

		//var str = stringFromUTF8Array(new Uint8Array(message));
		let str = me.decoder.decode(message);
		let obj = JSON.parse(str);

		if (obj && obj.type == 'ws' && obj.cmd === 'data') {
			obj = obj.data;
		}

		return obj;
	}

};
