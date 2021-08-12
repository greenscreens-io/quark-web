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

		const service = url;
		const id = Date.now();

		const resp = await fetch(service, {
			method: 'get',
			headers: {
				'x-time': id
			}
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

		const MIME = 'application/json';
		const HEADERS = {
			'Accept': MIME,
			'Content-Type': MIME
		};

		const body = JSON.stringify(data);
		const req = {
			method: 'post',
			headers: HEADERS,
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
