/* Quark Engine v1.0.1 (c) Green Screens Ltd. */


/*
class TestEvents extends EventES6 {
     constructor() {
        super();
     }
}
obj.on('', callback)
obj.once('', callback)
obj.trigger('', ...args)
*/

class Events {

	constructor() {
		this.listeners = new Map();
		this.onceListeners = new Map();
		this.triggerdLabels = new Map();
	}

	// help-function for onReady and onceReady
	// the callbackfunction will execute,
	// if the label has already been triggerd with the last called parameters
	_fCheckPast(label, callback) {
		if (this.triggerdLabels.has(label)) {
			callback(this.triggerdLabels.get(label));
			return true;
		} else {
			return false;
		}
	}

	// execute the callback everytime the label is trigger
	on(label, callback, checkPast = false) {
		this.listeners.has(label) || this.listeners.set(label, []);
		this.listeners.get(label).push(callback);
		if (checkPast)
			this._fCheckPast(label, callback);
	}

	// execute the callback everytime the label is trigger
	// check if the label had been already called
	// and if so excute the callback immediately
	onReady(label, callback) {
		this.on(label, callback, true);
	}

	// execute the callback onetime the label is trigger
	once(label, callback, checkPast = false) {
		this.onceListeners.has(label) || this.onceListeners.set(label, []);
		if (!(checkPast && this._fCheckPast(label, callback))) {
			// label wurde nocht nicht aufgerufen und
			// der callback in _fCheckPast nicht ausgeführt
			this.onceListeners.get(label).push(callback);
		}
	}

	// execute the callback onetime the label is trigger
	// or execute the callback if the label had been called already
	onceReady(label, callback) {
		this.once(label, callback, true);
	}

	// remove the callback for a label
	off(label, callback = true) {
		if (callback === true) {
			// remove listeners for all callbackfunctions
			this.listeners.delete(label);
			this.onceListeners.delete(label);
		} else {
			// remove listeners only with match callbackfunctions
			let _off = (inListener) => {
				let listeners = inListener.get(label);
				if (listeners) {
					inListener.set(label, listeners.filter((value) => !(value === callback)));
				}
			};
			_off(this.listeners);
			_off(this.onceListeners);
		}
	}

	// trigger the event with the label
	emit(label, ...args) {
		let res = false;
		this.triggerdLabels.set(label, ...args); // save all triggerd labels for onready and onceready
		let _trigger = (inListener, label, ...args) => {
			let listeners = inListener.get(label);
			if (listeners && listeners.length) {
				listeners.forEach((listener) => {
					listener(...args);
				});
				res = true;
			}
		};
		_trigger(this.onceListeners, label, ...args);
		_trigger(this.listeners, label, ...args);
		this.onceListeners.delete(label); // callback for once executed, so delete it.
		return res;
	}
}

/*
 * Copyright (C) 2015, 2020  Green Screens Ltd.
 */

/**
 * Queue to handle requests
 */
class Queue extends Map {

	constructor() {
		super();
		let me = this;

		me.up = 0;
		me.down = 0;
		me.tid = 0;
	}

	/**
	 * Update counters and queue to link resposnes to requests
	 * @param {Object} req
	 *      Request data
	 */
	updateRequest(req, callback) {
		let me = this;
		me.tid++;
		me.up++;
		req.tid = me.tid.toString();
		me.set(req.tid, callback);
	}

	/**
	 * Reset queue to remove old stalled elements
	 */
	reset() {
		let me = this;
		if (me.up > 50 && me.down >= me.up) {
			me.up = 0;
			me.down = 0;
		}
	}

	/**
	 * Process array of response records
	 *
	 * @param {Object} obj
	 */
	process(obj) {
		let me = this;
		if (Array.isArray(obj)) {
			obj.forEach( me.execute.bind(me) );
		} else {
			me.execute(obj);
		}
	}


	/**
	 * Process single response record
	 *
	 * @param {Object} obj
	 */
	execute(obj) {

		let me = this;
		let tid = obj.tid;

		me.down++;

		if (me.has(tid)) {
			try {
				me.get(tid)(null, obj);
			} finally {
				me.delete(tid);
			}
		}

		me.reset();

	};
}

/*
 * Copyright (C) 2015, 2020  Green Screens Ltd.
 */


/**
 * Convert hex string to int array
 *
 * @param str
 * @returns
 */
function hex2ab(str) {

	let a = [];

	for (let i = 0; i < str.length; i += 2) {
		a.push(parseInt("0x" + str.substr(i, 2), 16));
	}

	return a;
}

/**
 * Convert string to int array
 *
 * @param
 * 	 str - string to convert
 *
 * @returns
 * 	  ArrayBuffer of ints
 */
function str2ab(str) {

	let buf = new ArrayBuffer(str.length);
	let bufView = new Uint8Array(buf);

	for (let i = 0, strLen = str.length; i < strLen; i++) {
		bufView[i] = str.charCodeAt(i);
	}

	return buf;
}

/**
 * Convert array of ints into hex string
 *
 * @param
 * 	buffer - buffer is an ArrayBuffer
 *
 * @returns
 * 	string in hex format
 */
function buf2hex(buffer) {
	return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

/**
 * Convert int array (utf8 encoded) to string
 *
 * @param data
 * @returns
 */
function stringFromUTF8Array(data) {

	let extraByteMap = [1, 1, 1, 1, 2, 2, 3, 0];
	let count = data.length;
	let str = "";

	for (let index = 0; index < count;) {

		let ch = data[index++];
		if (ch & 0x80) {

			let extra = extraByteMap[(ch >> 3) & 0x07];
			if (!(ch & 0x40) || !extra || ((index + extra) > count)) {
				return null;
			}

			ch = ch & (0x3F >> extra);
			for (; extra > 0; extra -= 1) {

				let chx = data[index++];
				if ((chx & 0xC0) != 0x80) {
					return null;
				}

				ch = (ch << 6) | (chx & 0x3F);
			}

		}

		str += String.fromCharCode(ch);
	}

	return str;
}

/*
 * Copyright (C) 2015, 2020  Green Screens Ltd.
 */

/**
 * Browser native compression
 */
class Streams {

	// 'deflate' or 'gzip'

	static isAvailable() {
		return typeof CompressionStream !== 'undefined';
	}

	static async compress(text, encoding = 'gzip') {
		let byteArray = new TextEncoder().encode(text);
		let cs = new CompressionStream(encoding);
		let writer = cs.writable.getWriter();
		writer.write(byteArray);
		writer.close();
		return new Response(cs.readable).arrayBuffer();
	}

	static async decompress(byteArray, encoding = 'gzip') {
		let cs = new DecompressionStream(encoding);
		let writer = cs.writable.getWriter();
		writer.write(byteArray);
		writer.close();
		let arrayBuffer = await new Response(cs.readable).arrayBuffer();
		return new TextDecoder().decode(arrayBuffer);
	}

}

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

/*
 * Copyright (C) 2015, 2020  Green Screens Ltd.
 */

/**
 * Web and WebSocket API engine
 * Used to call remote services.
 * All Direct functions linked to defiend namespace
 */
 class Generator extends Events {

	constructor() {
		super();
		this._model = {};
	}

 	/**
 	 * Return generted API structure and callers
 	 */
 	get api() {
 		return this._model;
 	}

 	/**
 	* Disconnect generator from API callers
 	*/
 	stop() {
 		this.off('call');
 		this.off('api');
 	}

 	/**
 	 * Build JS object with callable functions that maps to Java side methods
 	 * Data is retrieved from API service
 	 *
 	 * @param {String} url || api object
 	 * 		  URL Address for API service definitions
 	 */
 	build(o) {
 		let data = o ? o.api || o : null;
 		if (!data) return data;
 		this._buildAPI(data);
 		return data;
 	}

 	/**
 	 * From API tree generate namespace tree and
 	 * links generated functions to WebScoket api calls
 	 *
 	 * @param {Object} cfg
 	 * 		Alternative definition to API
 	 */
 	_buildAPI(cfg) {

 		let me = this;

 		if (Array.isArray(cfg)) {
 			cfg.every(v => {
 				me._buildInstance(v);
 				return true;
 			});
 		} else {
 			me._buildInstance(cfg);
 		}

 	}

 	/**
 	 * Build from single definition
 	 *
 	 * @param {Object} api
 	 * 		  Java Class/Method definition
 	 */
 	_buildInstance(api) {

 		let me = this;
 		let tree = null;
 		let action = null;

 		tree = me._buildNamespace(api.namespace);

 		if (!tree[api.action]) {
 			tree[api.action] = {};
 		}
 		action = tree[api.action];

 		api.methods.every(v => {
 			me._buildMethod(api.namespace, api.action, action, v);
 			return true;
 		});
 	}

 	/**
 	 * Generate namespace object structure from string version
 	 *
 	 * @param  {String} namespace
 	 * 			Tree structure delimited with dots
 	 *
 	 * @return {Object}
 	 * 			Object tree structure
 	 */
 	_buildNamespace(namespace) {

 		let me = this;
 		let tmp = null;

 		namespace.split('.').every(v => {

 			if (!tmp) {
 				if (!me._model[v]) me._model[v] = {};
 				tmp = me._model[v];
 			} else {
 				if (!tmp[v]) tmp[v] = {};
 				// Object.freeze(tmp);
 				tmp = tmp[v];
 			}

 			return true;
 		});

 		return tmp;
 	}

 	/**
 	 * Build instance methods
 	 *
 	 * @param {String} namespace
 	 * @param {String} action
 	 * @param {String} instance
 	 * @param {Array} api
 	 */
 	_buildMethod(namespace, action, instance, api) {

 		let enc = api.encrypt === false ? false : true;
 		let cfg = {
 			n: namespace,
 			c: action,
 			m: api.name,
 			l: api.len,
 			e: enc
 		};

 		instance[api.name] = this._apiFn(cfg);
 		// Object.freeze(instance[api.name]);
 	}

 	/**
 	 * Generic function used to attach for generated API
 	 *
 	 * @param {Array} params List of arguments from caller
 	 */
 	_apiFn(params) {

 		var me = this;
 		var prop = params;

 		function fn() {

 			let args, req, promise = null;

 			args = Array.prototype.slice.call(arguments);

 			req = {
 				"namespace": prop.n,
 				"action": prop.c,
 				"method": prop.m,
 				"e": prop.e,
 				"data": args
 			};

 			promise = new Promise((resolve, reject) => {
 				me.emit('call', req, (err, obj) => {
 					me._onResponse(err, obj, prop, resolve, reject);
 				});
 			});

 			return promise;
 		}

 		return fn;
 	}

 	/**
 	 * Process remote response
 	 */
 	_onResponse(err, obj, prop, response, reject) {

 		if (err) {
 			reject(err);
 			return;
 		}

 		let sts = (prop.c === obj.action) &&
 			(prop.m === obj.method) &&
 			obj.result &&
 			obj.result.success;

 		if (sts) {
 			response(obj.result);
 		} else {
 			reject(obj.result || obj);
 		}

 	};

 }

/*
 * Copyright (C) 2015, 2020  Green Screens Ltd.
 */

/**
 * Web Requester Engine
 * Used to call remote services through HTTP/S
 */
class WebChannel {

	/**
	 * If http/s used in url, make standard fetch call to the defined service
	 */
	async init(engine) {

		let me = this;
		let Generator = engine.Generator;
		let Security = engine.Security;

		let data = await me.getAPI(engine.apiURL);
		await engine.registerAPI(data);

		if (engine.isSockChannel) return;

		Generator.on('call', async (req, callback) => {

			let o = null;
			let e = null;

			try {
				o = await me.onCall(engine, req);
			} catch (err) {
				e = err;
			}

			callback(e, o);

		});

	}

	stop() {

	}

	/**
	 * Get API definition through HTTP/s channel
	 *
	 * @param {String} url
	 * 		  URL Address for API service definitions
	 */
	async getAPI(url) {

		let service = url;
		let id = Date.now();

		let resp = await fetch(service, {
			method: 'get',
			headers: {
				'x-time': id
			}
		});

		let data = await resp.json();

		// update local challenge for signature verificator
		data.challenge = id.toString();

		return data;

	}

	/**
	 * Send data to server with http/s channel
	 */
	async fetchCall(url, data) {

		let MIME = 'application/json';
		let HEADERS = {
			'Accept': MIME,
			'Content-Type': MIME
		};

		let body = JSON.stringify(data);
		let req = {
			method: 'post',
			heaedrs: HEADERS,
			body: body
		};
		let res = await fetch(url, req);
		let json = await res.json();

		return json;
	}


	/**
	 * Prepare remtoe call, encrypt if avaialble
	 *
	 * @param {String} url
	 *        Service URL to receive data
	 *
	 * @param {Object} req
	 *         Data to sen (optionaly encrypt)
	 */
	async onCall(engine, req) {

		let me = this;
		let Security = engine.Security;
		let url = engine.serviceURL;

		let hasArgs = Array.isArray(req.data) && req.data.length > 0;
		let shouldEncrypt = Security.isActive() && hasArgs;
		let data = req;

		// encrypt if supported
		if (shouldEncrypt) {
			data = await Security.encrypt(JSON.stringify(req));
		}

		// send and wait for response
		data = await me.fetchCall(url, data);

		// if error throw
		if (data.cmd == 'err') {
			throw new Error(data.result.msg);
		}

		// if encrypted, decrypt
		if (data.cmd === 'enc') {
			data = await Security.decrypt(data);
		}

		// return server response
		return data;

	}

}

/*
 * Copyright (C) 2015, 2020  Green Screens Ltd.
 */


/**
 * Web and WebSocket API engine
 * Used to call remote services.
 * All Direct functions linked to io.greenscreens namespace
 */
class SocketChannel {

	constructor() {

		let me = this;

		me.queue = new Queue();
		me.webSocket = null;
		me.engine = null;
	}

	/**
	 * Initialize Socket channel
	 */
	async init(engine) {

		let me = this;
		me.stop();
		me.engine = engine;

		return new Promise((resolve, reject) => {
			me._startSocket(resolve, reject);
			return null;
		});

	}

	/**
	 * Close WebSocket channel if available
	 */
	stop() {
		let me = this;
		if (me.webSocket == null) return false;
		me.webSocket.close();
		me.webSocket = null;
		me.engine = null;
		return true;
	}

	async _startSocket(resolve, reject) {

		let me = this;
		let engine = me.engine;
		let generator = engine.Generator;
		let security = engine.Security;

		let challenge = Date.now();
		let url = engine.serviceURL + '?q=' + challenge;

		me.webSocket = new WebSocket(url, ['ws4is']);
		me.webSocket.binaryType = "arraybuffer";

		let onCall = me.onCall.bind(me);

		me.webSocket.onopen = (event) => {

			generator.on('call', onCall);

			if (!engine.isWSAPI) {
				return resolve(true);
			}

			generator.once('api', async (data) => {

				try {
					data.challenge = challenge;
					await engine.registerAPI(data);
					resolve(true);
				} catch (e) {
					reject(e);
				}

			});

		};

		me.webSocket.onclose = (event) => {
			generator.off('call', onCall);
			me.stop();
		}

		me.webSocket.onerror = (event) => {
			generator.off('call', onCall);
			reject(event);
			me.stop();
		};

		me.webSocket.onmessage = (event) => {
			me._prepareMessage(event.data);
		};

	}

	/**
	 * Parse and prepare received message for processing
	 *
	 * @param {String} mesasge
	 *
	 */
	async _prepareMessage(message) {

		let me = this;
		let obj = null;

		let engine = me.engine;
		let generator = engine.Generator;

		try {

			if (message instanceof ArrayBuffer) {
				let text = await Streams.decompress(message);
				obj = JSON.parse(text);
			}

			if (typeof message === 'string') {
				obj = JSON.parse(message);
			}

			if (obj) {
				me.onMessage(obj);
			} else {
				generator.emit('error', event);
			}

		} catch (e) {
			generator.emit('error', e);
		}

	}

	/**
	 * Process received message
	 *
	 * @param {*} msg
	 *
	 */
	async onMessage(obj) {

		let me = this;
		let data = null;

		let engine = me.engine;
		let generator = engine.Generator;
		let security = engine.Security;

		if (obj.cmd === 'api') {
			return generator.emit('api', obj.data);
		}

		if (obj.cmd === 'err') {
			return generator.emit('error', obj.result);
		}

		if (obj.cmd === 'enc') {
			data = await security.decrypt(obj);
		}

		if (obj.cmd === 'data') {
			data = obj.data;
		}

		if (data) {
			me.queue.process(data);
		}

	}

};

/*
 * Copyright (C) 2015, 2020  Green Screens Ltd.
 */

/**
 * Expose `Emitter`.
 */

/**
 * Web and WebSocket API engine
 * Used to initialize remote API and remote services.
 */
 const ERROR_MESSAGE = 'Invalid definition for Engine Remote Service';
 const ERROR_API_UNDEFIEND = 'API Url not defined!';
 const ERROR_SVC_UNDEFIEND = 'Service Url not defined!';

 /**
  * Main class for Quark Engine Client
  */
 class Engine {

 	constructor(cfg) {

 		cfg = cfg || {};

 		if (!cfg.api) {
 			throw new Error(ERROR_API_UNDEFIEND);
 		}

 		if (!cfg.service) {
 			throw new Error(ERROR_SVC_UNDEFIEND);
 		}

 		let me = this;

		me.cfg = null;
		me.isWSAPI = false;
		me.isWebChannel = false;
		me.isSockChannel = false;

		me.Security = null;
		me.Generator = null;
		me.WebChannel = null;
		me.SockChannel = null;

 		me.cfg = cfg;
 		me.isWSAPI = cfg.api === cfg.service && cfg.api.indexOf('ws') == 0;

 		me.isWebChannel = cfg.service.indexOf('http') === 0;
 		me.isSockChannel = cfg.service.indexOf('ws') === 0;

 		if ((me.isWebChannel || me.isSockChannel) === false ) {
 			throw new Error(ERROR_MESSAGE);
 		}

 	}

 	/*
 	 * Initialize engine, throws error,
 	 */
 	async init() {

 		let me = this;
 		if (me.isActive) return;

 		me.Security = new Security();
 		me.Generator = new Generator();

 		if (me.isWebChannel) {
 			me.WebChannel = new WebChannel();
 			await me.WebChannel.init(me);
 		}

 		if (me.isSockChannel) {
 			me.SocketChannel = new SocketChannel();
 			await me.SocketChannel.init(me);
 		}

 	}

 	/**
 	 * Use internaly from channel to register received
 	 * API definitiona and security data
 	 */
 	async registerAPI(data) {

 		let me = this;

 		// initialize encryption if provided
 		if (data.signature) {
 			if (!me.Security.isActive()) {
 				await me.Security.init(data);
 			}
 		}

 		me.Generator.build(data.api);
 	}

 	/**
 	 * Stop engine instance by clearing all references
 	 * stoping listeners, stoping socket is avaialble
 	 */
 	stop() {

 		let me = this;

 		if (me.WebChannel) me.WebChannel.stop();
 		if (me.SocketChannel) me.SocketChannel.stop();
 		if (me.Generator) me.Generator.stop();

 		me.WebChannel = null;
 		me.SocketChannel = null;
 		me.Generator = null;
 		me.Security = null;
 		me.cfg = null;
 	}

 	/*
 	 * Return generated API
 	 */
 	get api() {
 		return this.Generator ? this.Generator.api : null;
 	}

 	/*
 	 * Check if engine is active
 	 */
 	get isActive() {
 		return this.api && this.Security;
 	}

 	/*
 	 * Return API URL address
 	 */
 	get apiURL() {
 		return this.cfg ? this.cfg.api : null;
 	}

 	/*
 	 * Return Service URL address
 	 */
 	get serviceURL() {
 		return this.cfg ? this.cfg.service : null;
 	}

}

