/*
 * Copyright (C) 2015, 2022 Green Screens Ltd.
 */

import Generator from "./Generator.mjs";
import Security from "./Security.mjs";
import SocketChannel from "./Socket.mjs";
import WebChannel from "./Web.mjs";

/**
 * Web and WebSocket API engine
 * Used to initialize remote API and remote services.
 */
const ERROR_MESSAGE = 'Invalid definition for Engine Remote Service';
const ERROR_API_UNDEFINED = 'API Url not defined!';
const ERROR_SVC_UNDEFINED = 'Service Url not defined!';

/**
 * Main class for Quark Engine Client
 */
export default class Engine {

	constructor(cfg) {

		cfg = cfg || {};

		if (!cfg.api) {
			throw new Error(ERROR_API_UNDEFINED);
		}

		if (!cfg.service) {
			throw new Error(ERROR_SVC_UNDEFINED);
		}

		const me = this;

		me.cfg = null;
		me.isWSAPI = false;
		me.isWebChannel = false;
		me.isSocketChannel = false;

		me.Security = null;
		me.Generator = null;
		me.WebChannel = null;
		me.SocketChannel = null;
		me.id = Date.now();

		me.cfg = cfg;
		me.isWSAPI = cfg.api === cfg.service && cfg.api.indexOf('ws') == 0;

		me.headers = cfg.headers || {};
		me.querys = cfg.querys || {};

		me.isWebChannel = cfg.service.indexOf('http') === 0;
		me.isSocketChannel = cfg.service.indexOf('ws') === 0;

		if ((me.isWebChannel || me.isSocketChannel) === false) {
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
		me.Generator = new Generator(me.id);

		if (me.isWebChannel || me.isWSAPI == false) {
			me.WebChannel = new WebChannel();
			await me.WebChannel.init(me);
		}

		if (me.isSocketChannel) {
			me.SocketChannel = new SocketChannel();
			await me.SocketChannel.init(me);
		}

		return me;
	}

	/**
	 * Use internaly from channel to register received
	 * API definitiona and security data
	 */
	async registerAPI(data) {

		const me = this;

		// initialize encryption if provided
		if (data.signature) {
			if (!me.Security?.isActive) {
				await me.Security.init(data);
			}
		}

		me.Generator?.build(data.api);
	}

	/**
	 * Stop engine instance by clearing all references
	 * stoping listeners, stoping socket is avaialble
	 */
	stop() {

		const me = this;

		me.WebChannel?.stop();
		me.SocketChannel?.stop();
		me.Generator?.stop();

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
		return this.Generator?.api || null;
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
		return this.cfg?.api || null;
	}

	/*
	 * Return Service URL address
	 */
	get serviceURL() {
		return this.cfg?.service || null;
	}

	/*
	 * Static instance builder
	 */
	static async init(cfg) {
		const engine = new Engine(cfg);
		return engine.init();
	}
}
