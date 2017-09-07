'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.FINGERPRINT = undefined;
exports.getFingerprint = getFingerprint;
exports.humanize = humanize;

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Collision-resistant small id of process optimized for horizontal scaling and binary search lookup performance.
 * Fingerprint of process is based on a hash of hostname + pid + random.
 * Original concept taken from cuid
 */

var pid = parseInt(process.pid, 10);
var padding = 2;

var randomized = pad(parseInt(Math.random() * 1000000000).toString(36), padding);

function pad(num, size) {
    var s = '000000000' + num;
    return s.substr(s.length - size);
}

var length = _os2.default.hostname().length;

var hostname = _os2.default.hostname().split('').reduce(function (prev, char) {
    return +prev + char.charCodeAt(0);
}, +length + 36).toString(36);

var hostId = pad(hostname, padding);

var FINGERPRINT = exports.FINGERPRINT = hostId + pad(pid.toString(36), padding) + randomized;

// Optimized for binary search lookup performance
function getFingerprint() {
    return FINGERPRINT;
}
// Optimize for human
function humanize(fingerprint) {
    return fingerprint.match(/.{2}/g).join('-');
}