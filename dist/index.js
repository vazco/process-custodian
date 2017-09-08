'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.humanize = exports.getFingerprint = exports.ProcessCustodian = undefined;

var _fingerprint = require('./lib/fingerprint');

var _ProcessCustodian = require('./lib/ProcessCustodian');

var _ProcessCustodian2 = _interopRequireDefault(_ProcessCustodian);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.ProcessCustodian = _ProcessCustodian2.default;
exports.getFingerprint = _fingerprint.getFingerprint;
exports.humanize = _fingerprint.humanize;


_ProcessCustodian2.default.ProcessCustodian = _ProcessCustodian2.default;
_ProcessCustodian2.default.getFingerprint = _fingerprint.getFingerprint;
_ProcessCustodian2.default.humanize = _fingerprint.humanize;

exports.default = _ProcessCustodian2.default;