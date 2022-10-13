/*
 * Copyright (C) 2015, 2020  Green Screens Ltd.
 */

/*
 * Simulate NoedJS Buffer, simple
 */
class Buffer {

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

		let arry = [];

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

/*
 * Copyright (C) 2015, 2020  Green Screens Ltd.
 */

/*
class TestEvents extends EventES6 {
     constructor() {
        super();
     }
}
obj.on('', callback)
obj.once('', callback)
obj.emit('', ...args)
*/

class Events {

	constructor() {
		this.listeners = new Map();
		this.onceListeners = new Map();
		this.triggers = new Map();
	}

	// help-function for onReady and onceReady
	// the callbackfunction will execute,
	// if the label has already been triggerd with the last called parameters
	_checkPast(label, callback) {
		const me = this;
		if (me.triggers.has(label)) {
			callback(me.triggers.get(label));
			return true;
		} else {
			return false;
		}
	}

	// execute the callback everytime the label is trigger
	on(label, callback, checkPast = false) {
		const me = this;
		me.listeners.has(label) || me.listeners.set(label, []);
		me.listeners.get(label).push(callback);
		if (checkPast)
			me._checkPast(label, callback);
	}

	// execute the callback everytime the label is trigger
	// check if the label had been already called
	// and if so excute the callback immediately
	onReady(label, callback) {
		this.on(label, callback, true);
	}

	// execute the callback onetime the label is trigger
	once(label, callback, checkPast = false) {
		const me = this;
		me.onceListeners.has(label) || me.onceListeners.set(label, []);
		if (!(checkPast && me._checkPast(label, callback))) {
			me.onceListeners.get(label).push(callback);
		}
	}

	// execute the callback onetime the label is trigger
	// or execute the callback if the label had been called already
	onceReady(label, callback) {
		this.once(label, callback, true);
	}

	// remove the callback for a label
	off(label, callback = true) {
		const me = this;
		if (callback === true) {
			// remove listeners for all callbackfunctions
			me.removeAllListeners(label);
		} else {
			// remove listeners only with match callbackfunctions
			let _off = (inListener) => {
				const listeners = inListener.get(label);
				if (listeners) {
					inListener.set(label, listeners.filter((value) => (value !== callback)));
				}
			};
			_off(me.listeners);
			_off(me.onceListeners);
		}
	}

	removeAllListeners(label) {
		const me = this;
		me.listeners.delete(label);
		me.onceListeners.delete(label);
	}

	trigger(label, ...args) {
		this.emit(label, ...args);
	}

	// trigger the event with the label
	emit(label, ...args) {
		const me = this;		
		me.triggers.set(label, ...args); // save all triggerd labels for onready and onceready
		const _trigger = (inListener, label, ...args) => {
			const listeners = inListener.get(label);
			if (listeners && listeners.length) {
				listeners.forEach((listener) => {
					listener(...args);
				});
				return true;
			}
		};
		let res = _trigger(me.onceListeners, label, ...args);
		res = res || _trigger(me.listeners, label, ...args);
		me.onceListeners.delete(label); // callback for once executed, so delete it.
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
		const me = this;

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
		const me = this;
		me.tid++;
		me.up++;
		req.tid = me.tid.toString();
		me.set(req.tid, callback);
	}

	/**
	 * Reset queue to remove old stalled elements
	 */
	reset() {
		const me = this;
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

		const me = this;
		const unknown = [];

		if (Array.isArray(obj)) {
			obj.forEach((o) => {
				const res = me.execute(o);
				if (res) unkown.push(res);
			});
		} else {
			const o = me.execute(obj);
			if (o) unknown.push(o);
		}

		return unknown;
	}


	/**
	 * Process single response record
	 *
	 * @param {Object} obj
	 */
	execute(obj) {

		const me = this;
		const tid = obj.tid;
		let unknown = null;

		me.down++;

		if (me.has(tid)) {
			try {
				me.get(tid)(null, obj);
			} catch (e) {
				console.log(e);
				me.get(tid)(e, null);
			} finally {
				me.delete(tid);
			}
		} else {
			unknown = obj;
		}

		me.reset();

		return unknown;
	}
}

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
		let encoded = data;

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
			return obj.data;
		}

		return obj;
	}

	static async init(cfg) {
		const security = new Security();
		await security.init(cfg);
		return security;
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

		const me = this;
		me.removeAllListeners('call');
		me.removeAllListeners('api');
		me.detach();
	}

	/**
	 * Detach generated API namespace from global
	 */
	detach() {
		const me = this;
		const root = typeof global === 'undefined' ? self : global;
		Object.keys(me._model).forEach(v => root[v] = null);
		me._model = {};
	}

	/**
	 * Attach generated API namespace to global
	 */
	attach() {
		const me = this;
		const root = typeof global === 'undefined' ? self : global;
		Object.entries(me._model).forEach(v => root[v[0]] = v[1]);
	}

	/**
	 * Build JS object with callable functions that maps to Java side methods
	 * Data is retrieved from API service
	 *
	 * @param {String} url || api object
	 * 		  URL Address for API service definitions
	 */
	build(o) {

		const me = this;
		const data = o ? o.api || o : null;

		if (!data) return data;
		me._buildAPI(data);
		me.attach();

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

		const me = this;

		if (Array.isArray(cfg)) {
			cfg.forEach(v => me._buildInstance(v));
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

		const me = this;
		let tree = null;
		let action = null;

		tree = me._buildNamespace(api.namespace);

		if (!tree[api.action]) {
			tree[api.action] = {};
		}
		action = tree[api.action];

		api.methods.forEach(v => me._buildMethod(api.namespace, api.action, action, v));

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

		const me = this;
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

		const enc = api.encrypt === false ? false : true;
		const cfg = {
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

		const me = this;
		const prop = params;

		function fn() {

			let args, req, promise = null;

			args = Array.prototype.slice.call(arguments);

			req = {
				"namespace": prop.n,
				"action": prop.c,
				"method": prop.m,
				"e": prop.e,
				"data": args,
				"ts":Date.now()
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

		const sts = (prop.c === obj.action) &&
			(prop.m === obj.method) &&
			obj.result &&
			obj.result.success;

		if (sts) {
			response(obj.result);
		} else {
			reject(obj.result || obj);
		}

	}

	/**
	 * Static instance builder
	 */
	static async build(cfg) {
		const generator = new Generator();
		generator.build(cfg);
		return generator;
	}

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

		const me = this;

		if (me.engine) me.stop();

		me.engine = engine;
		const generator = engine.Generator;

		const data = await me.getAPI(engine.apiURL);
		await engine.registerAPI(data);

		if (engine.isSockChannel) return;

		generator.on('call', me.onRequest.bind(me));

	}

	/**
	 * Disengage listeners and links
	 */
	stop() {

		const me = this;
		const engine = me.engine;
		me.engine = null;

		engine.Generator.off('call');
		if (!engine.isSockChannel) {
			fetch(engine.serviceURL, {
				method: 'delete'
			});
		}
	}

	/**
	 * Callback for API call request,
	 * here we make remote API call
	 */
	async onRequest(req, callback) {

		const me = this;
		let o = null;
		let e = null;

		try {
			o = await me.onCall(me.engine, req);
		} catch (err) {
			e = err;
		}

		callback(e, o);

	}

	/**
	 * Get API definition through HTTP/s channel
	 *
	 * @param {String} url
	 * 		  URL Address for API service definitions
	 */
	async getAPI(url) {

		const me = this;
		const service = url;
		const engine = me.engine; 
		const id = Date.now();

		const headers = Object.assign({}, engine.headers || {}, {'x-time': id});
		
		const resp = await fetch(service, {
			method: 'get',
			headers: headers
		});

		const data = await resp.json();

		// update local challenge for signature verificator
		data.challenge = id.toString();

		return data;

	}

	/**
	 * Send data to server with http/s channel
	 */
	async fetchCall(url, data) {

		const me = this;
		const engine = me.engine;
		const MIME = 'application/json';
		const HEADERS_ = {
			'Accept': MIME,
			'Content-Type': MIME
		};
		
		const headers = Object.assign({}, engine.headers || {}, HEADERS_);
		const body = JSON.stringify(data);
		const req = {
			method: 'post',
			headers: headers,
			body: body
		};
		const res = await fetch(url, req);
		const json = await res.json();

		return json;
	}


	/**
	 * Prepare remote call, encrypt if available
	 *
	 * @param {String} url
	 *        Service URL to receive data
	 *
	 * @param {Object} req
	 *         Data to send (optionally encrypt)
	 */
	async onCall(engine, req) {

		const me = this;
		const security = engine.Security;
		const url = engine.serviceURL;

		const hasArgs = Array.isArray(req.data) && req.data.length > 0;
		const shouldEncrypt = security.isValid && hasArgs;
		let data = req;

		// encrypt if supported
		if (shouldEncrypt) {
			data = await security.encrypt(req);
		}

		// send and wait for response
		data = await me.fetchCall(url, data);

		// if error throw
		if (data.cmd == 'err') {
			throw new Error(data.result.msg);
		}

		// if encrypted, decrypt
		if (data.cmd === 'enc') {
			if (security.isValid) {
				data = await security.decrypt(data);
			} else {
				throw new Error('Security available on https/wss only');
			}
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
class SocketChannel extends Events {

	constructor() {
		super();
		const me = this;

		me.queue = new Queue();
		me.webSocket = null;
		me.engine = null;
	}

	/**
	 * Initialize Socket channel
	 */
	async init(engine) {

		const me = this;
		me.stop();
		me.engine = engine;

		return new Promise((resolve, reject) => {
			me._startSocket(resolve, reject);
			return null;
		});

	}
	
	get isOpen() {
		const me = this;
		if (me.webSocket == null) return false;
		return me.webSocket.readyState === me.webSocket.OPEN;		
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

	/**
	 * Check if data can be encrypted
	 *
	 * @param {Object} req
	 */
	canEncrypt(req) {
		const hasArgs = Array.isArray(req.data) && req.data.length > 0 && req.e !== false;
		return this.engine.Security.isValid && hasArgs;
	}

	/**
	 * Prepare remtoe call, encrypt if avaialble
	 *
	 * @param {Object} req
	 *         Data to send (optionaly encrypt)
	 */
	async onCall(req, callback) {

		const me = this;
		let msg = null;
		let enc = null;
		let data = null;

		const isEncrypt = me.canEncrypt(req);

		me.queue.updateRequest(req, callback);

		// encrypt if supported
		if (isEncrypt) {
			enc = await me.engine.Security.encrypt(req.data);
			req.data = [enc];
		}

		data = {
			cmd: isEncrypt ? 'enc' : 'data',
			type: 'ws',
			data: [req]
		};

		msg = JSON.stringify(data);

		if (!Streams.isAvailable) {
			return me.webSocket.send(msg);
		}

		msg = await Streams.compress(msg);
		me.webSocket.send(msg);
	}

	async _startSocket(resolve, reject) {

		const me = this;
		const engine = me.engine;
		const generator = engine.Generator;

		const challenge = Date.now();
		const url = new URL(engine.serviceURL);
		
		let headers = Object.assign({}, engine.headers || {});
		headers.q = challenge;
		headers.c = Streams.isAvailable;
		
		Object.entries(headers || {}).forEach((v) => {
			url.searchParams.append(v[0], encodeURIComponent(v[1]));			
		});

		me.webSocket = new WebSocket(url.toString(), ['ws4is']);
		me.webSocket.binaryType = "arraybuffer";

		const onCall = me.onCall.bind(me);

		me.webSocket.onopen = (event) => {

			me.emit('online', event);
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
			me.emit('offline', event);
		}

		me.webSocket.onerror = (event) => {
			generator.off('call', onCall);
			reject(event);
			me.stop();
			me.emit('error', event);
		};

		me.webSocket.onmessage = (event) => {
			me._prepareMessage(event.data);
		};

	}

	_isJsonObj(msg) {
		return msg.startsWith('{') && msg.endsWith('}');
	}
	
	_isJsonArray(msg) {
		return msg.startsWith('[') && msg.endsWith(']');
	}
	
	/**
	 * Parse and prepare received message for processing
	 *
	 * @param {String} mesasge
	 *
	 */
	async _prepareMessage(message) {

		const me = this;
		const engine = me.engine;
		const generator = engine.Generator;
		
		let obj = null;
		let text = message;
		
		try {

			if (message instanceof ArrayBuffer) {
				text = await Streams.decompress(message);
			}

			const msg = text.trim();
			const isJSON = me._isJsonObj(msg) || me._isJsonArray(msg); 
			if (isJSON) {
				obj = JSON.parse(text);
				me.onMessage(obj);				
			} else {
				generator.emit('raw', text);	
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

		const me = this;
		let data = null;

		const engine = me.engine;
		const generator = engine.Generator;
		const security = engine.Security;

		if (obj.cmd === 'api') {
			return generator.emit('api', obj.data);
		}

		if (obj.cmd === 'err') {
			return generator.emit('error', obj.result);
		}

		if (obj.cmd === 'enc') {
			if (Security.isAvailable) {
				data = await security.decrypt(obj);
			} else {
				return generator.emit('error', new Error('Security available on https/wss only'));
			}
		}

		if (obj.cmd === 'data') {
			data = obj.data;
		}

		if (data) {
			const unknown = me.queue.process(data);
			unknown.forEach((obj) => me.emit('message', obj));
		} else {
			me.emit('message', data);
		}

	}

}

/*
 * Copyright (C) 2015, 2020  Green Screens Ltd.
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

		const me = this;

		me.cfg = null;
		me.isWSAPI = false;
		me.isWebChannel = false;
		me.isSockChannel = false;

		me.Security = null;
		me.Generator = null;
		me.WebChannel = null;
		me.SocketChannel = null;

		me.cfg = cfg;
		me.isWSAPI = cfg.api === cfg.service && cfg.api.indexOf('ws') == 0;

		me.headers = cfg.headers || {};

		me.isWebChannel = cfg.service.indexOf('http') === 0;
		me.isSockChannel = cfg.service.indexOf('ws') === 0;

		if ((me.isWebChannel || me.isSockChannel) === false) {
			throw new Error(ERROR_MESSAGE);
		}

	}

	/*
	 * Initialize engine, throws error,
	 */
	async init() {

		const me = this;
		if (me.isActive) return;

		me.Security = new Security();
		me.Generator = new Generator();

		if (me.isWebChannel || me.isWSAPI == false) {
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

		const me = this;

		// initialize encryption if provided
		if (data.signature) {
			if (!me.Security.isActive) {
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

		const me = this;

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
		const me = this;
		if (me.SocketChannel && !me.SocketChannel.isOpen) return false; 
		return me.api && me.Security ? true : false;
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

	/*
	 * Static instance builder
	 */
	static async init(cfg) {
		const engine = new Engine(cfg);
		await engine.init();
		return engine;
	}
}
