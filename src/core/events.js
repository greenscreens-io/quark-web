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
		const me = this;
		me.listeners = new Map();
		me.onceListeners = new Map();
		me.triggers = new Map();
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
			const _off = (inListener) => {
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
