'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.humanize = exports.getFingerprint = exports.init = undefined;

var _fingerprint = require('./lib/fingerprint');

var _mongoStorage = require('./lib/mongoStorage');

exports.init = _mongoStorage.init;
exports.getFingerprint = _fingerprint.getFingerprint;
exports.humanize = _fingerprint.humanize;
exports.default = _mongoStorage.init;