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

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var ensureIndexExist = function () {
    var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(tickTimeInSeconds) {
        return _regenerator2.default.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        _context.next = 2;
                        return this._collection.indexExists('ttl');

                    case 2:
                        if (_context.sent) {
                            _context.next = 5;
                            break;
                        }

                        _context.next = 5;
                        return this._collection.createIndex({ lastActivity: -1 }, {
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
                        return this._collection.updateOne({ _id: _fingerprint.FINGERPRINT }, {
                            $setOnInsert: {
                                _id: _fingerprint.FINGERPRINT,
                                title: process.title,
                                processStartAt: processStartAt,
                                eventLoopLag: this.getEventLoopLag(),
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
    var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(tickTime, marginTimeForRenew) {
        var renewDate, result;
        return _regenerator2.default.wrap(function _callee3$(_context3) {
            while (1) {
                switch (_context3.prev = _context3.next) {
                    case 0:
                        renewDate = new Date();

                        renewDate.setSeconds(renewDate.getSeconds() - (tickTime + marginTimeForRenew));
                        _context3.prev = 2;
                        _context3.next = 5;
                        return this._collection.updateOne({
                            // if renewing own reservation
                            _id: _constants.MASTER_KEY,
                            fingerprint: _fingerprint.FINGERPRINT,
                            lastActivity: { $gte: renewDate }
                        }, {
                            $set: {
                                fingerprint: _fingerprint.FINGERPRINT,
                                lastActivity: new Date()
                            }
                        });

                    case 5:
                        result = _context3.sent;
                        return _context3.abrupt('return', result.modifiedCount);

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

    return function renewingMasterReservation(_x2, _x3) {
        return _ref4.apply(this, arguments);
    };
}();

var tryBeMaster = function () {
    var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(tickTime, marginTimeForRenew, isInit) {
        var result, deathDate, limit;
        return _regenerator2.default.wrap(function _callee4$(_context4) {
            while (1) {
                switch (_context4.prev = _context4.next) {
                    case 0:
                        _context4.prev = 0;
                        _context4.next = 3;
                        return this._collection.updateOne({
                            // if no active master
                            _id: _constants.MASTER_KEY
                        }, {
                            $setOnInsert: {
                                _id: _constants.MASTER_KEY,
                                fingerprint: _fingerprint.FINGERPRINT,
                                lastActivity: new Date()
                            }
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
                        limit = tickTime + (isInit ? marginTimeForRenew : marginTimeForRenew * 2);
                        // no active master or last one is too busy to be master

                        deathDate.setSeconds(deathDate.getSeconds() - limit);
                        _context4.next = 11;
                        return this._collection.updateOne({
                            // if no active master
                            _id: _constants.MASTER_KEY,
                            lastActivity: { $lt: deathDate }
                        }, {
                            $set: {
                                fingerprint: _fingerprint.FINGERPRINT,
                                lastActivity: new Date()
                            }
                        });

                    case 11:
                        result = _context4.sent;
                        return _context4.abrupt('return', result.modifiedCount);

                    case 15:
                        _context4.prev = 15;
                        _context4.t0 = _context4['catch'](0);

                        console.error('ActivityQueue[tryBeMaster]:', _context4.t0);

                    case 18:
                        return _context4.abrupt('return', false);

                    case 19:
                    case 'end':
                        return _context4.stop();
                }
            }
        }, _callee4, this, [[0, 15]]);
    }));

    return function tryBeMaster(_x4, _x5, _x6) {
        return _ref5.apply(this, arguments);
    };
}();

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

/**
 *
 * @param rawCollection
 * @param tickTimeInSeconds: Number
 * @returns {{isMaster: function, stop: function, onTick: function, onIAmNewMaster: function, onIAmSlave: function}}
 */

var ProcessCustodian = function () {
    function ProcessCustodian(_ref) {
        var _this = this;

        var rawCollection = _ref.rawCollection,
            _ref$tickTimeInSecond = _ref.tickTimeInSeconds,
            tickTimeInSeconds = _ref$tickTimeInSecond === undefined ? 45 : _ref$tickTimeInSecond,
            _ref$marginTimeForRen = _ref.marginTimeForRenew,
            marginTimeForRenew = _ref$marginTimeForRen === undefined ? 15 : _ref$marginTimeForRen,
            _ref$standardHighLeve = _ref.standardHighLevel,
            standardHighLevel = _ref$standardHighLeve === undefined ? 100 : _ref$standardHighLeve;
        (0, _classCallCheck3.default)(this, ProcessCustodian);
        this._standardHighLevel = 99;
        this._smoothingFactor = 1 / 3;
        this._isMaster = false;
        this._emitter = null;
        this._timeout = null;
        this._currentLag = 0;
        this._expectedFiredTime = Infinity;
        this._stop = null;
        this.onTick = noop;
        this.onIAmNewMaster = noop;
        this.onIAmSlave = noop;
        this.onceTick = noop;
        this.onceIAmNewMaster = noop;
        this.onceIAmSlave = noop;

        this.isMaster = function () {
            return _this._isMaster;
        };

        this.stop = function () {
            if (_this._stop) {
                _this._stop();
                _this._collection.deleteOne({ _id: _fingerprint.FINGERPRINT });
                _this._collection.deleteOne({ id: _constants.MASTER_KEY, FINGERPRINT: _fingerprint.FINGERPRINT });
                _this._stop = null;
                _this._emitter.emit(_constants.EVENTS.STOP);
            }
        };

        if (!rawCollection) {
            throw new Error('Missing Collection in constructor of ProcessCustodian');
        }
        if ((typeof Meteor === 'undefined' ? 'undefined' : (0, _typeof3.default)(Meteor)) === 'object' && Meteor.bindEnvironment) {
            this._bindEnvironment = Meteor.bindEnvironment;
        }
        this._standardHighLevel = standardHighLevel;
        this._emitter = new _events2.default();
        this._collection = rawCollection;
        ensureIndexExist.call(this, tickTimeInSeconds);
        this._stop = runActivityQueue.call(this, tickTimeInSeconds, marginTimeForRenew, true);

        // preparing methods onTick, onIAmNewMaster, onIAmSlave
        (0, _values2.default)(_constants.EVENTS).forEach(function (key) {
            return _this['on' + key] = function (fn) {
                if (_this._bindEnvironment) {
                    fn = _this._bindEnvironment(fn);
                }
                _this._emitter.on(key, fn);
                return function () {
                    return _this._emitter.removeListener(key, fn);
                };
            };
        });
        // once
        (0, _values2.default)(_constants.EVENTS).forEach(function (key) {
            return _this['once' + key] = function (fn) {
                if (_this._bindEnvironment) {
                    fn = _this._bindEnvironment(fn);
                }
                _this._emitter.once(key, fn);
            };
        });
    }

    /**
     * fired on every checking of the event loop
     * @param {function} - event handler
     * @returns {function} - stop handler
     */

    /**
     * fired every time when process will being a master
     * @param {function} - event handler
     * @returns {function} - stop handler
     */

    /**
     * runs every time when process is going back to be a slave
     * @param {function} - event handler
     * @returns {function} - stop listening handler
     */


    /**
     * Runs the passed function on next checking of the event loop
     * @param {function} - event handler
     * @returns {function} - stop handler
     */

    /**
     * fired once when process being be a master
     * @param {function} - event handler
     * @returns {function} - stop handler
     */

    /**
     * fired one time when process will lost master status
     * @param {function} - event handler
     * @returns {function} - stop handler
     */


    /**
     * Is this master process?
     * @returns {boolean}
     */


    (0, _createClass3.default)(ProcessCustodian, [{
        key: 'getEventLoopLag',


        /**
         * lag value from last sampling of event loop
         * @returns {number}
         */
        value: function getEventLoopLag() {
            return Math.round(this._currentLag);
        }

        /**
         * Checks if the event loop lag is on too high level.
         * Using this information you can put away of computing new job,
         * or even stop the request processing early then process will freeze
         */

    }, {
        key: 'isOverloaded',
        value: function isOverloaded() {
            return this._currentLag > this._standardHighLevel;
        }

        /**
         * Uniq fingerprint of process
         */

    }, {
        key: 'getFingerprint',
        value: function getFingerprint() {
            return _fingerprint.FINGERPRINT;
        }

        /**
         * stops sampling loop
         */

    }]);
    return ProcessCustodian;
}();

exports.default = ProcessCustodian;


function _stop() {
    if (this._timeout !== null) {
        clearTimeout(this._timeout);
        this._timeout = null;
    }
}

function runActivityQueue(tickTimeInSeconds, marginTimeForRenew) {
    var _this2 = this;

    var isInit = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

    if (isInit && this._timeout !== null) {
        // there is only one loop for activity per process
        return _stop.bind(this);
    }
    var doTick = function () {
        var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5() {
            var wasMaster, lag;
            return _regenerator2.default.wrap(function _callee5$(_context5) {
                while (1) {
                    switch (_context5.prev = _context5.next) {
                        case 0:
                            wasMaster = _this2._isMaster;
                            lag = Math.max(0, Date.now() - _this2._expectedFiredTime);
                            // @see https://en.wikipedia.org/wiki/Exponential_smoothing
                            // we weigh the current value against the previous value 3:1 to smooth bounds.

                            _this2._currentLag = _this2._smoothingFactor * lag + (1 - _this2._smoothingFactor) * _this2._currentLag;
                            _context5.prev = 3;

                            if (!wasMaster) {
                                _context5.next = 10;
                                break;
                            }

                            _context5.next = 7;
                            return renewingMasterReservation.call(_this2, tickTimeInSeconds, marginTimeForRenew);

                        case 7:
                            _this2._isMaster = _context5.sent;
                            _context5.next = 14;
                            break;

                        case 10:
                            if (_this2.isOverloaded()) {
                                _context5.next = 14;
                                break;
                            }

                            _context5.next = 13;
                            return tryBeMaster.call(_this2, tickTimeInSeconds, marginTimeForRenew, isInit);

                        case 13:
                            _this2._isMaster = _context5.sent;

                        case 14:
                            _context5.next = 16;
                            return oneHeartbeat.call(_this2, tickTimeInSeconds);

                        case 16:
                            _context5.next = 21;
                            break;

                        case 18:
                            _context5.prev = 18;
                            _context5.t0 = _context5['catch'](3);

                            console.error('ActivityQueue:', _context5.t0);

                        case 21:
                            _context5.prev = 21;

                            _this2._expectedFiredTime = Date.now() + tickTimeInSeconds * 1000;
                            runActivityQueue.call(_this2, tickTimeInSeconds, marginTimeForRenew);
                            _this2._emitter.emit(_constants.EVENTS.TICK);
                            if (!wasMaster && _this2._isMaster) {
                                _this2._emitter.emit(_constants.EVENTS.I_AM_MASTER);
                            }
                            if ((wasMaster || isInit) && !_this2._isMaster) {
                                _this2._emitter.emit(_constants.EVENTS.I_AM_SLAVE);
                            }
                            return _context5.finish(21);

                        case 28:
                        case 'end':
                            return _context5.stop();
                    }
                }
            }, _callee5, _this2, [[3, 18, 21, 28]]);
        }));

        return function doTick() {
            return _ref6.apply(this, arguments);
        };
    }();
    if (isInit) {
        doTick();
    } else {
        this._timeout = setTimeout(doTick, tickTimeInSeconds * 1000);
        // unref-ing the timeout, so to not be the only action that would hold the node-process open.
        this._timeout.unref && this._timeout.unref();
    }
    return _stop.bind(this);
}

function noop() {
    /* noop */
}