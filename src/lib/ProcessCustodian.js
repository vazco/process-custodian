import {MASTER_KEY, EVENTS} from './constants';
import {FINGERPRINT} from  './fingerprint';
import EventEmitter from 'events';
import os from 'os';


const processStartAt = new Date();

const pid = parseInt(process.pid, 10);
const hostName = os.hostname();

/**
 *
 * @param rawCollection
 * @param tickTimeInSeconds: Number
 * @returns {{isMaster: function, stop: function, onTick: function, onIAmNewMaster: function, onIAmSlave: function}}
 */

class ProcessCustodian {
    _standardHighLevel = 99;
    _smoothingFactor = 1/3;
    _isMaster = false;
    _emitter = null;
    _timeout = null;
    _currentLag = 0;
    _expectedFiredTime = Infinity;
    _stop = null;

    constructor ({rawCollection, tickTimeInSeconds = 45, marginTimeForRenew = 15, standardHighLevel = 100}) {
        if (!rawCollection) {
            throw new Error('Missing Collection in constructor of ProcessCustodian');
        }
        if (typeof Meteor === 'object' && Meteor.bindEnvironment) {
            this._bindEnvironment = Meteor.bindEnvironment;
        }
        this._standardHighLevel = standardHighLevel;
        this._emitter = new EventEmitter();
        this._collection = rawCollection;
        ensureIndexExist.call(this, tickTimeInSeconds);
        this._stop = runActivityQueue.call(this, tickTimeInSeconds, marginTimeForRenew, true);

        // preparing methods onTick, onIAmNewMaster, onIAmSlave
        Object.values(EVENTS).forEach(key => this[`on${key}`] = (fn => {
            if (this._bindEnvironment) {
                fn = this._bindEnvironment(fn);
            }
            this._emitter.on(key, fn);
            return () => this._emitter.removeListener(key, fn);
        }));
        // once
        Object.values(EVENTS).forEach(key => this[`once${key}`] = (fn => {
            if (this._bindEnvironment) {
                fn = this._bindEnvironment(fn);
            }
            this._emitter.once(key, fn);
        }));
    }

    /**
     * fired on every checking of the event loop
     * @param {function} - event handler
     * @returns {function} - stop handler
     */
    onTick = noop;
    /**
     * fired every time when process will being a master
     * @param {function} - event handler
     * @returns {function} - stop handler
     */
    onIAmNewMaster = noop;
    /**
     * runs every time when process is going back to be a slave
     * @param {function} - event handler
     * @returns {function} - stop listening handler
     */
    onIAmSlave = noop;

    /**
     * Runs the passed function on next checking of the event loop
     * @param {function} - event handler
     * @returns {function} - stop handler
     */
    onceTick = noop;
    /**
     * fired once when process being be a master
     * @param {function} - event handler
     * @returns {function} - stop handler
     */
    onceIAmNewMaster = noop;
    /**
     * fired one time when process will lost master status
     * @param {function} - event handler
     * @returns {function} - stop handler
     */
    onceIAmSlave = noop;

    /**
     * Is this master process?
     * @returns {boolean}
     */
    isMaster = () => {
        return this._isMaster;
    };

    /**
     * lag value from last sampling of event loop
     * @returns {number}
     */
    getEventLoopLag () {
        return Math.round(this._currentLag);
    }

    /**
     * Checks if the event loop lag is on too high level.
     * Using this information you can put away of computing new job,
     * or even stop the request processing early then process will freeze
     */
    isOverloaded () {
        return this._currentLag > this._standardHighLevel;
    }

    /**
     * Uniq fingerprint of process
     */
    getFingerprint () {
        return FINGERPRINT;
    }

    /**
     * stops sampling loop
     */
    stop = async () => {
        if (this._stop) {
            await this._collection.deleteOne({_id: FINGERPRINT});
            await this._collection.deleteOne({id: MASTER_KEY, FINGERPRINT});
            this._stop();
            this._stop = null;
            this._emitter.emit(EVENTS.STOP);
        }
    };
}

export default ProcessCustodian;



async function ensureIndexExist (tickTimeInSeconds) {
    if (!await this._collection.indexExists('ttl')) {
        await this._collection.createIndex({lastActivity: -1}, {
            name: 'ttl',
            expireAfterSeconds: tickTimeInSeconds * 3
        });
    }
}

async function oneHeartbeat () {
    try {
        const result = await this._collection.updateOne({_id: FINGERPRINT}, {
            $setOnInsert: {
                _id: FINGERPRINT,
                title: process.title,
                eventLoopLag: this.getEventLoopLag(),
                processStartAt,
                hostName,
                pid
            },
            $set: {
                lastActivity: new Date()
            }
        }, {sort: {lastActivity: -1}, upsert: true});

        return result.upsertedCount || result.modifiedCount;
    } catch (err) {
        console.error('ActivityQueue[oneHeartbeat]:', err);
    }
    return false;
}

async function renewingMasterReservation (tickTime, marginTimeForRenew) {
    const renewDate = new Date();
    renewDate.setSeconds(renewDate.getSeconds() - (tickTime + marginTimeForRenew));
    try {
        const result = await this._collection.updateOne({
            // if renewing own reservation
            _id: MASTER_KEY,
            fingerprint: FINGERPRINT,
            lastActivity: {$gte: renewDate}
        }, {
            $set: {
                fingerprint: FINGERPRINT,
                lastActivity: new Date()
            }
        });
        return result.modifiedCount;
    } catch (err) {
        console.error('ActivityQueue[renewingMasterReservation]:', err);
    }
    return false;
}

async function tryBeMaster (tickTime, marginTimeForRenew, isInit) {
    try {
        // check if you can be first master
        let result = await this._collection.updateOne({
            // if no active master
            _id: MASTER_KEY,
        }, {
            $setOnInsert: {
                _id: MASTER_KEY,
                fingerprint: FINGERPRINT,
                lastActivity: new Date()
            }
        }, {
            upsert: true
        });
        if (result.upsertedCount) {
            return true;
        }
        const deathDate = new Date();
        const limit = (tickTime + (isInit? marginTimeForRenew : (marginTimeForRenew * 2)));
        // no active master or last one is too busy to be master
        deathDate.setSeconds(deathDate.getSeconds() - limit);
        result = await this._collection.updateOne({
            // if no active master
            _id: MASTER_KEY,
            lastActivity: {$lt: deathDate}
        }, {
            $set: {
                fingerprint: FINGERPRINT,
                lastActivity: new Date()
            }
        });
        return result.modifiedCount;
    } catch (err) {
        console.error('ActivityQueue[tryBeMaster]:', err);
    }
    return false;
}


function _stop () {
    if (this._timeout !== null) {
        clearTimeout(this._timeout);
        this._timeout = null;
    }
}


function runActivityQueue (tickTimeInSeconds, marginTimeForRenew, isInit = false) {
    if (isInit &&  this._timeout !== null) {
        // there is only one loop for activity per process
        return _stop.bind(this);
    }
    const doTick = async () => {
        const wasMaster = this._isMaster;
        const lag = Math.max(0, (Date.now() - this._expectedFiredTime));
        // @see https://en.wikipedia.org/wiki/Exponential_smoothing
        // we weigh the current value against the previous value 3:1 to smooth bounds.
        this._currentLag = this._smoothingFactor *  lag + (1 - this._smoothingFactor) * this._currentLag;
        try {
            if (wasMaster) {
                this._isMaster = await renewingMasterReservation.call(this, tickTimeInSeconds, marginTimeForRenew);
            } else if (!this.isOverloaded()) {
                //don't want to try to be a master is with crossed standard lag limit
                this._isMaster = await tryBeMaster.call(this, tickTimeInSeconds, marginTimeForRenew, isInit);
            }
            await oneHeartbeat.call(this, tickTimeInSeconds);
        } catch (err) {
            console.error('ActivityQueue:', err);
        } finally {
            this._expectedFiredTime = Date.now() + tickTimeInSeconds * 1000;
            runActivityQueue.call(this, tickTimeInSeconds, marginTimeForRenew);
            this._emitter.emit(EVENTS.TICK);
            if (!wasMaster && this._isMaster) {
                this._emitter.emit(EVENTS.I_AM_MASTER);
            }
            if ((wasMaster || isInit) && !this._isMaster) {
                this._emitter.emit(EVENTS.I_AM_SLAVE);
            }
        }
    };
    if (isInit) {
        doTick();
    } else {
        this._timeout = setTimeout(doTick, tickTimeInSeconds * 1000);
        // unref-ing the timeout, so to not be the only action that would hold the node-process open.
        this._timeout.unref && this._timeout.unref();
    }
    return _stop.bind(this);
}

function noop () {
    /* noop */
}
