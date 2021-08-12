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

		const me = this;
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
		const array = new Uint8Array(size);
		crypto.getRandomValues(array);
		return array;
	}

	/**
	 * Create AES key for data encryption
	 * @returns CryptoKey
	 */
	async generateAesKey() {
		const type = {
			name: "AES-CTR",
			length: 128
		};
		const mode = ["encrypt", "decrypt"];
		return crypto.subtle.generateKey(type, true, mode);
	}

	/**
	 * Extract CryptoKey into RAW bytes
	 * @param {CryptoKey} key
	 * @returns Uin8Array
	 */
	async exportAesKey(key) {
		const buffer = await crypto.subtle.exportKey("raw", key);
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

		const binaryDer = Buffer.from(key, 'base64');

		return crypto.subtle.importKey(
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

		const me = this;
		const binSignature = Buffer.from(signature, 'base64');
		const binChallenge = me.encoder.encode(challenge);

		const type = {
			name: "ECDSA",
			hash: {
				name: "SHA-384"
			}
		};

		return crypto.subtle.verify(
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

		const me = this;
		const encoded = data;

		if (typeof data === 'string') {
			encoded = me.encoder.encode(data);
		}

		return crypto.subtle.encrypt(
			"RSA-OAEP",
			me.encKEY,
			encoded
		);
	}

	/**
	 * Encrypt message with AES
	 */
	async encryptAesMessage(key, iv, data) {

		const encoded = this.encoder.encode(data);
		const type = {
			name: "AES-CTR",
			counter: iv,
			length: 128
		};

		return crypto.subtle.encrypt(type, key, encoded);
	}

	/**
	 * Decrypt AES encrypted message
	 */
	async decryptAesMessage(key, iv, data) {

		const databin = Buffer.from(data, "hex");
		const counter = Buffer.from(iv, "hex");

		const type = {
			name: "AES-CTR",
			counter: counter,
			length: 128
		};

		return crypto.subtle.decrypt(type, key, databin);
	}

	get isValid() {
		const me = this;
		return me.encKEY !== null && me.aesKEY !== null;
	}

	static get isAvailable() {
		return crypto.subtle != null;
	}

	/**
	 * Initialize encryption and verification keys
	 * Verifies data signatures to prevent tampering
	 */
	async init(cfg) {

		const me = this;

		if (!Security.isAvailable) {
			console.log('Security mode not available, TLS protocol required.');
			return;
		}

		console.log('Security Initializing...');

		me.VERSION++;

		me.encKEY = await me.importRsaKey(cfg.keyEnc, {
			name: 'RSA-OAEP',
			hash: 'SHA-256'
		}, 'encrypt');

		me.aesKEY = await me.generateAesKey();
		me.exportedAES = await me.exportAesKey(me.aesKEY);

		const verKey = await me.importRsaKey(cfg.keyVer, {
			name: 'ECDSA',
			namedCurve: "P-384"
		}, 'verify');

		const status = await me.verify(verKey, cfg.signature, me.getChallenge(cfg || {}));

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

		const me = this;
		const iv = me.getRandom(16);
		const key = new Uint8Array(iv.length + me.exportedAES.length);

		key.set(iv);
		key.set(me.exportedAES, iv.length);

		const str = (typeof data === 'string') ? data : JSON.stringify(data);
		const encryptedKey = await me.encryptRSA(key);
		const encryptedData = await me.encryptAesMessage(me.aesKEY, iv, str);

		if (bin === true) {
			return {
				t:'1',
				d: encryptedData,
				k: encryptedKey
			};
		}

		return {
			t:'1',
			d: Buffer.to(encryptedData, 'hex'),
			k: Buffer.to(encryptedKey, 'hex')
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

		const me = this;
		const iv = cfg.iv;
		const data = cfg.d;

		const message = await me.decryptAesMessage(me.aesKEY, iv, data);

		const str = me.decoder.decode(message);
		const obj = JSON.parse(str);

		if (obj && obj.type == 'ws' && obj.cmd === 'data') {
			obj = obj.data;
		}

		return obj;
	}

	static async init(cfg) {
		const security = new Security();
		await security.init(cfg);
		return security;
	}

};
