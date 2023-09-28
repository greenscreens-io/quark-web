/*
 * Copyright (C) 2015, 2023 Green Screens Ltd.
 */

export default class QuarkBuffer {

    static #encoder = new TextEncoder();
    static #decoder = new TextDecoder();

    /**
     * Detect data and convert to Uint8Array
     * 
     * @param {variant}
     * @returns {variant}
     */
    static validateData(src) {
        let data = null;
        if (src instanceof Array) {
            data = new Uint8Array(src);
        } else if (src instanceof ArrayQuarkBuffer) {
            data = new Uint8Array(src);
        } else if (src instanceof Uint8Array) {
            data = src;
        } else if (src instanceof String || typeof src === 'string') {
            data = QuarkBuffer.fromText(src);
        } else if (src.toArrayQuarkBuffer) {
            data = new Uint8Array(src.toArrayQuarkBuffer());
        } else {
            throw "Invalid input, must be String or ArrayQuarkBuffer or Uint8Array";
        }
        return data;
    }

    /**
     * Verify if data is string
     * @param {*} data 
     * @returns 
     */
    static isString(data) {
        return typeof data === 'string';
    }

    /**
     * Check if string is hex string
     * @param {*} data 
     * @returns 
     */
    static isHexString(data) {
        return QuarkBuffer.isString(data) ? (/^[0-9A-Fa-f]+$/g).test(data) : false;
    }

    static toQuarkBuffer(data, b64 = false) {
        const me = QuarkBuffer;
        if (me.isString(data)) {
            if (b64) {
                data = me.fromBase64(data);
            } else if (me.isHexString(data)) {
                data = me.fromHex(data);
            } else {
                data = me.fromText(data);
            }
        }
        return me.validateData(data);
    }

    static toText(val) {
        return QuarkBuffer.isText(val) ? val : QuarkBuffer.#decoder.decode(val);
    }

    static fromText(val) {
        return QuarkBuffer.isText(val) ? QuarkBuffer.#encoder.encode(val) : val;
    }

    static isText(val) {
        return typeof val === 'string';
    }

    static fromHex(value) {

        const arry = [];

        for (let i = 0; i < value.length; i += 2) {
            arry.push(parseInt("0x" + value.substr(i, 2), 16));
        }

        return new Uint8Array(arry);
    }

    static toHex(QuarkBuffer) {
        return Array.prototype.map.call(new Uint8Array(QuarkBuffer), x => ('00' + x.toString(16)).slice(-2)).join('');
    }

    static fromBase64(value) {

        const strbin = atob(value);
        const QuarkBuffer = new ArrayQuarkBuffer(strbin.length);
        const bufView = new Uint8Array(QuarkBuffer);

        for (let i = 0, strLen = strbin.length; i < strLen; i++) {
            bufView[i] = strbin.charCodeAt(i);
        }

        return bufView;
    }

    static toBase64(QuarkBuffer) {
        return globalThis.btoa(new Uint8Array(QuarkBuffer));
    }

}
