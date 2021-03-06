'use strict';

var crypto = require('crypto');
const logger = require('../log/logger');

// encrypt/decrypt functions
module.exports = {

    base64UrlEncode: function (buffer) {
        return buffer.toString('base64')
                .replace(/\+/g, '-') // Convert '+' to '-'
                .replace(/\//g, '_') // Convert '/' to '_'
                .replace(/=+$/, ''); // Remove ending '='
    },

    base64UrlDecode: function (base64) {
        // Add removed at end '='
        base64 += Array(5 - base64.length % 4).join('=');

        base64 = base64
                .replace(/\-/g, '+') // Convert '-' to '+'
                .replace(/\_/g, '/'); // Convert '_' to '/'

        return new Buffer(base64, 'base64');
    },

    /**
     * Generate JWE by given payload and key
     * @param Object payload to encrypt
     * @param Buffer key
     * @returns String base64 url safe token
     */
    compact: function (payload, key) {
        try {
            var text = JSON.stringify(payload);

            // random initialization vector
            var iv = crypto.randomBytes(12);

            // AES 256 GCM Mode
            var cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

            // encrypt the given payload
            var encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

            // extract the auth tag
            var tag = cipher.getAuthTag();

            // compact
            var arr = [];

            // header
            var header = {
                alg: 'dir',
                enc: 'A256GCM'
            };
            arr.push(this.base64UrlEncode(new Buffer(JSON.stringify(header))));
            arr.push('.');
            arr.push('.');
            arr.push(this.base64UrlEncode(iv));
            arr.push('.');
            arr.push(this.base64UrlEncode(encrypted));
            arr.push('.');
            arr.push(this.base64UrlEncode(tag));
            return arr.join('');

        } catch (e) {
            logger.warn(e);
        }

        // error
        return null;
    },

    /**
     * Decrypts token by given key
     * @param String base64 encoded input token
     * @param Buffer key
     * @returns Object decrypted (original) payload
     */
    verify: function (token, key) {
        // split the token by .
        var arr = token.split('.');

        // convert data to buffers
        var iv = this.base64UrlDecode(arr[2]);
        var text = this.base64UrlDecode(arr[3]);
        var tag = this.base64UrlDecode(arr[4]);

        // AES 256 GCM Mode
        var decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);

        // decrypt the given text
        var decrypted = decipher.update(text, 'binary', 'utf8') + decipher.final('utf8');

        return JSON.parse(decrypted);
    }
};
