/*
 * Copyright (C) 2015, 2024 Green Screens Ltd.
 */

import QuarkEvent from "./Event.mjs";
import Request from "./Request.mjs";
import QuarkError from './Error.mjs';

/**
 * Web and WebSocket API engine
 * Used to call remote services.
 * All Direct functions linked to defiend namespace
 */
export default class QuarkGenerator extends QuarkEvent {

	#model = {};
	#id = null;
	#cnt = 0;
	#timeout = 0;

	constructor(id = 0, timeout = 0) {
		super();
		this.#id = id;
		this.#timeout = timeout;
	}

	/**
	 * Return generated API structure and callers
	 */
	get api() {
		return this.#model;
	}

	/**
	 * Disconnect generator from API callers
	 */
	stop() {

		const me = this;
		me.off('call');
		me.off('api');
		me.off('raw');
		me.off('error');
		me.#detach();
	}

	#cleanup(obj, id) {
		for (let k in obj) {
			let el = obj[k];
			if (typeof el === 'object') {
				if (this.#cleanup(el, id)) obj[k] = null;
			} else if (el._id_ === id) {
				obj[k] = null;
			}
		}
		return Object.values(obj).filter(o => o != null).length === 0;
	}

	#detach() {
		const me = this;
		me.#cleanup(me.#model, me.#id);
		me.#model = {};
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

		if (data) me.#buildAPI(data);

		return data;
	}

	/**
	 * From API tree generate namespace tree and
	 * links generated functions to WebScoket api calls
	 *
	 * @param {Object} cfg
	 * 		Alternative definition to API
	 */
	#buildAPI(cfg) {

		const me = this;

		if (Array.isArray(cfg)) {
			cfg.forEach(v => me.#buildInstance(v));
		} else {
			me.#buildInstance(cfg);
		}

	}

	/**
	 * Build from single definition
	 *
	 * @param {Object} api
	 * 		  Java Class/Method definition
	 */
	#buildInstance(api) {

		const me = this;
		let tree = null;
		let action = null;

		tree = me.#buildNamespace(api.namespace);

		if (!tree[api.action]) {
			tree[api.action] = {};
		}
		action = tree[api.action];

		me.#reduce(api.methods)?.forEach(v => me.#buildMethod(action, v, me.#id));

	}

	/**
	 * Reduce duplicate methods with parameters overrides
	 * @param {Array<Object>} list 
	 * @returns 
	 */
	#reduce(list) {
		return list.reduce((a, v, i, ar) => {

			if (a.filter(r => r.name == v.name).length == 1) return a;

			const objs = ar.filter(r => r.name == v.name);
			if (objs.length === 1) {
				a.push(v);
				return a;
			}

			const obj = objs.filter(r => r.name === v.name).reduce((a, v) => {
				a.mid.push(v.mid);
				a.len.push(v.len);
				a.async[v.len] = v.async;
				return a;
			}, { name: v.name, mid: [], len: [], async: {} });

			a.push(obj);
			return a
		}, []);
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
	#buildNamespace(namespace) {

		const me = this;

		let tmp = globalThis;
		let tmp2 = me.#model;

		namespace.split('.').every(v => {

			if (!tmp[v]) tmp[v] = {};
			tmp = tmp[v];

			if (!tmp2[v]) tmp2[v] = tmp;
			tmp2 = tmp;

			return true;
		});

		return tmp;
	}

	/**
	 * Build instance methods
	 *
	 * @param {String} instance
	 * @param {Array} api
	 * @param {String} id
	 */
	#buildMethod(instance, api, id) {

		const enc = api.encrypt === false ? false : true;
		const cfg = {
			l: api.len,
			a: api.async || false,
			x: api.mid,
			e: enc,
			i: id
		};

		instance[api.name] = this.#apiFn(cfg);
		instance[api.name]._id_ = id;
		// Object.freeze(instance[api.name]);
	}

	/**
	 * Generic function used to attach for generated API
	 *
	 * @param {Array} params List of arguments from caller
	 */
	#apiFn(params) {

		const me = this;
		const prop = params;

		const fn = function () {

			const args = Array.prototype.slice.call(arguments);

			// overriden function with multiple param lengths
			const isOverride = Array.isArray(prop.l);

			const idx = isOverride ? prop.l.indexOf(args.length) : -1;
			
			const handle = isOverride ? prop.x[idx] : prop.x;			
			const len = isOverride ? prop.l[idx] : prop.l;
			const isAsync = isOverride ? prop.a[idx] : prop.a;
			const timeout = isAsync ? 0 : me.#timeout;
			
			if (args.length != len) throw new Error(`Invalid arguments length. Required (${prop.l})`);
			if (!handle) throw new Error('Invalid remote caller handle.');

			const req = {
				"handle": handle,
				"id": prop.i,
				"enc": prop.e,
				"data": args,
				"key": ++me.#cnt,
				"tid": 0,
				"ts": Date.now()
			};
			Object.seal(req);

			return new Promise((resolve, reject) => {
				try {
					const proxy = Request.wrap(req, timeout, (obj) => {
						me.#onResponse(obj, resolve, reject);
					});
					me.emit('call', proxy);
				} catch (e) {
					console.log(e);
					reject(e);
				}
			});
		}
		return fn;
	}

	/**
	 * Process remote response
	 */
	#onResponse(obj, resolve, reject) {

		if (obj instanceof Error) return reject(obj);

		const result = obj.result || obj;

		if (result.success) {
			resolve(result);
		} else {
			reject(QuarkError.create(result));
		}

	}

	/**
	 * Static instance builder
	 * @param {object} cfg Api list from server side Quark engine
	 * @param {number} id Unique Quark Engine ID - to link functions to the engine instance
	 * @returns 
	 */
	static build(cfg, id, timeout) {
		const generator = new QuarkGenerator(id, timeout);
		generator.build(cfg);
		return generator;
	}

}
