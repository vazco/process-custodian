'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.humanize = exports.FINGERPRINT = exports.init = undefined;

var _fingerprint = require('./lib/fingerprint');

var _mongoStorage = require('./lib/mongoStorage');

exports.init = _mongoStorage.init;
exports.FINGERPRINT = _fingerprint.FINGERPRINT;
exports.humanize = _fingerprint.humanize;
exports.default = _mongoStorage.init;