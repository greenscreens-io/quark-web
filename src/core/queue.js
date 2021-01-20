/*
 * Copyright (C) 2015, 2021  Green Screens Ltd.
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
		let unknown = [];

		if (Array.isArray(obj)) {
			obj.forEach((o) => {
				let res = me.execute(o);
				if (res) unkown.push(res);
			});
		} else {
			let o = me.execute(obj);
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

		let me = this;
		let tid = obj.tid;
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
	};
}
