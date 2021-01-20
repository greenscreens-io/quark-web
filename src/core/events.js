/*
 * Copyright (C) 2015, 2021  Green Screens Ltd.
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
		if (this.triggers.has(label)) {
			callback(this.triggers.get(label));
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
			this._checkPast(label, callback);
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
		if (!(checkPast && this._checkPast(label, callback))) {
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
			this.removeAllListeners(label);
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

	removeAllListeners(label) {
		this.listeners.delete(label);
		this.onceListeners.delete(label);
	}

	trigger(label, ...args) {
		this.emit(label, ...args);
	}

	// trigger the event with the label
	emit(label, ...args) {
		let res = false;
		this.triggers.set(label, ...args); // save all triggerd labels for onready and onceready
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
