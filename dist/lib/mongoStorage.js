'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _values = require('babel-runtime/core-js/object/values');

var _values2 = _interopRequireDefault(_values);

var ensureIndexExist = function () {
    var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(tickTimeInSeconds) {
        return _regenerator2.default.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        _context.next = 2;
                        return collection.indexExists('ttl');

                    case 2:
                        if (_context.sent) {
                            _context.next = 5;
                            break;
                        }

                        _context.next = 5;
                        return collection.createIndex({ lastActivity: -1 }, {
                            name: 'ttl',
                            expireAfterSeconds: tickTimeInSeconds * 3
                        });

                    case 5:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function ensureIndexExist(_x) {
        return _ref2.apply(this, arguments);
    };
}();

var oneHeartbeat = function () {
    var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2() {
        var result;
        return _regenerator2.default.wrap(function _callee2$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        _context2.prev = 0;
                        _context2.next = 3;
                        return collection.updateOne({ _id: _fingerprint.FINGERPRINT }, {
                            $setOnInsert: {
                                _id: _fingerprint.FINGERPRINT,
                                title: process.title,
                                processStartAt: processStartAt,
                                hostName: hostName,
                                pid: pid
                            },
                            $set: {
                                lastActivity: new Date()
                            }
                        }, { sort: { lastActivity: -1 }, upsert: true });

                    case 3:
                        result = _context2.sent;
                        return _context2.abrupt('return', result.upsertedCount || result.modifiedCount);

                    case 7:
                        _context2.prev = 7;
                        _context2.t0 = _context2['catch'](0);

                        console.error('ActivityQueue[oneHeartbeat]:', _context2.t0);

                    case 10:
                        return _context2.abrupt('return', false);

                    case 11:
                    case 'end':
                        return _context2.stop();
                }
            }
        }, _callee2, this, [[0, 7]]);
    }));

    return function oneHeartbeat() {
        return _ref3.apply(this, arguments);
    };
}();

var renewingMasterReservation = function () {
    var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(tickTime) {
        var renewDate, result;
        return _regenerator2.default.wrap(function _callee3$(_context3) {
            while (1) {
                switch (_context3.prev = _context3.next) {
                    case 0:
                        renewDate = new Date();

                        renewDate.setSeconds(renewDate.getSeconds() - tickTime * 2);
                        _context3.prev = 2;
                        _context3.next = 5;
                        return collection.updateOne({
                            // if renewing own reservation
                            _id: _constants.MASTER_KEY,
                            FINGERPRINT: _fingerprint.FINGERPRINT,
                            lastActivity: { $gte: renewDate }
                        }, {
                            $set: {
                                FINGERPRINT: _fingerprint.FINGERPRINT,
                                lastActivity: new Date()
                            }
                        });

                    case 5:
                        result = _context3.sent;
                        return _context3.abrupt('return', result.upsertedCount || result.modifiedCount);

                    case 9:
                        _context3.prev = 9;
                        _context3.t0 = _context3['catch'](2);

                        console.error('ActivityQueue[renewingMasterReservation]:', _context3.t0);

                    case 12:
                        return _context3.abrupt('return', false);

                    case 13:
                    case 'end':
                        return _context3.stop();
                }
            }
        }, _callee3, this, [[2, 9]]);
    }));

    return function renewingMasterReservation(_x2) {
        return _ref4.apply(this, arguments);
    };
}();

var tryBeMaster = function () {
    var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(tickTime, isInit) {
        var result, deathDate;
        return _regenerator2.default.wrap(function _callee4$(_context4) {
            while (1) {
                switch (_context4.prev = _context4.next) {
                    case 0:
                        _context4.prev = 0;
                        _context4.next = 3;
                        return collection.updateOne({
                            // if no active master
                            _id: _constants.MASTER_KEY
                        }, {
                            $setOnInsert: { _id: _constants.MASTER_KEY }
                        }, {
                            upsert: true
                        });

                    case 3:
                        result = _context4.sent;

                        if (!result.upsertedCount) {
                            _context4.next = 6;
                            break;
                        }

                        return _context4.abrupt('return', true);

                    case 6:
                        deathDate = new Date();
                        // no active master or last one is too busy to be master

                        deathDate.setSeconds(deathDate.getSeconds() - tickTime * (isInit ? 2 : 3));
                        _context4.next = 10;
                        return collection.updateOne({
                            // if no active master
                            _id: _constants.MASTER_KEY,
                            lastActivity: { $lte: deathDate }
                        }, {
                            $set: {
                                FINGERPRINT: _fingerprint.FINGERPRINT,
                                lastActivity: new Date()
                            }
                        });

                    case 10:
                        result = _context4.sent;
                        return _context4.abrupt('return', result.upsertedCount || result.modifiedCount);

                    case 14:
                        _context4.prev = 14;
                        _context4.t0 = _context4['catch'](0);

                        console.error('ActivityQueue[tryBeMaster]:', _context4.t0);

                    case 17:
                        return _context4.abrupt('return', false);

                    case 18:
                    case 'end':
                        return _context4.stop();
                }
            }
        }, _callee4, this, [[0, 14]]);
    }));

    return function tryBeMaster(_x3, _x4) {
        return _ref5.apply(this, arguments);
    };
}();

exports.init = init;

var _constants = require('./constants');

var _fingerprint = require('./fingerprint');

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var processStartAt = new Date();

var pid = parseInt(process.pid, 10);
var hostName = _os2.default.hostname();
var collection = null;
var _isMaster = false;
var emitter = null;

// handle of mongodb collection
function init(_ref) {
    var rawCollection = _ref.rawCollection,
        _ref$tickTimeInSecond = _ref.tickTimeInSeconds,
        tickTimeInSeconds = _ref$tickTimeInSecond === undefined ? 60 : _ref$tickTimeInSecond;

    emitter = new _events2.default();
    collection = rawCollection;
    ensureIndexExist(tickTimeInSeconds);
    var stop = runActivityQueue(tickTimeInSeconds, true);
    var handler = {
        isMaster: isMaster,
        stop: stop
    };
    // preparing methods onTick, onIAmNewMaster, onIAmSlave
    (0, _values2.default)(_constants.EVENTS).forEach(function (key) {
        return handler['on' + key] = function (fn) {
            return emitter.on(key, fn);
        };
    });
    return handler;
}

function isMaster() {
    return _isMaster;
}

var timeout = null;

var _stop = function _stop() {
    if (timeout !== null) {
        clearTimeout(timeout);
        timeout = null;
    }
};

function runActivityQueue(tickTimeInSeconds) {
    var _this = this;

    var isInit = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

    if (isInit && timeout !== null) {
        // there is only one loop for activity per process
        return _stop;
    }
    timeout = setTimeout((0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5() {
        var wasMaster;
        return _regenerator2.default.wrap(function _callee5$(_context5) {
            while (1) {
                switch (_context5.prev = _context5.next) {
                    case 0:
                        wasMaster = _isMaster;
                        _context5.prev = 1;

                        if (!wasMaster) {
                            _context5.next = 8;
                            break;
                        }

                        _context5.next = 5;
                        return renewingMasterReservation(tickTimeInSeconds);

                    case 5:
                        _isMaster = _context5.sent;
                        _context5.next = 11;
                        break;

                    case 8:
                        _context5.next = 10;
                        return tryBeMaster(tickTimeInSeconds, isInit);

                    case 10:
                        _isMaster = _context5.sent;

                    case 11:
                        _context5.next = 13;
                        return oneHeartbeat(tickTimeInSeconds);

                    case 13:
                        _context5.next = 18;
                        break;

                    case 15:
                        _context5.prev = 15;
                        _context5.t0 = _context5['catch'](1);

                        console.error('ActivityQueue:', _context5.t0);

                    case 18:
                        _context5.prev = 18;

                        runActivityQueue(tickTimeInSeconds);
                        emitter.emit(_constants.EVENTS.TICK);
                        if (!wasMaster && _isMaster) {
                            emitter.emit(_constants.EVENTS.I_AM_MASTER);
                        }
                        if ((wasMaster || isInit) && !_isMaster) {
                            emitter.emit(_constants.EVENTS.I_AM_SLAVE);
                        }
                        return _context5.finish(18);

                    case 24:
                    case 'end':
                        return _context5.stop();
                }
            }
        }, _callee5, _this, [[1, 15, 18, 24]]);
    })), isInit ? 0 : tickTimeInSeconds * 1000);

    return _stop;
}