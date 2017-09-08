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
    _isMaster = false;
    _emitter = null;
    _timeout = null;
    _stop = null;

    constructor ({rawCollection, tickTimeInSeconds = 60, marginTimeForRenew = 10}) {
        if (!rawCollection) {
            throw new Error('Missing Collection in constructor of ProcessCustodian');
        }
        this._emitter = new EventEmitter();
        this._collection = rawCollection;
        ensureIndexExist.call(this, tickTimeInSeconds);
        this._stop = runActivityQueue.call(this, tickTimeInSeconds, marginTimeForRenew, true);

        // preparing methods onTick, onIAmNewMaster, onIAmSlave
        Object.values(EVENTS).forEach(key => this[`on${key}`] = (fn => {
            this._emitter.on(key, fn);
            return () => this._emitter.removeListener(key, fn);
        }));
        // once
        Object.values(EVENTS).forEach(key => this[`once${key}`] = (fn => {
            this._emitter.once(key, fn);
        }));
    }

    isMaster = () => {
        return this._isMaster;
    };

    stop = () => {
        if (this._stop) {
            this._stop();
            this._collection.deleteOne({_id: FINGERPRINT});
            this._collection.deleteOne({id: MASTER_KEY, FINGERPRINT});
            this._stop = null;
        }
    };
}

export default ProcessCustodian;



async function ensureIndexExist (tickTimeInSeconds) {
    if (!await this._collection.indexExists('ttl')) {
        await this._collection.createIndex({lastActivity: -1}, {
            name: 'ttl',
            expireAfterSeconds: tickTimeInSeconds * 3
        })
    }
}

async function oneHeartbeat () {
    try {
        const result = await this._collection.updateOne({_id: FINGERPRINT}, {
            $setOnInsert: {
                _id: FINGERPRINT,
                title: process.title,
                processStartAt: processStartAt,
                hostName,
                pid
            },
            $set: {
                lastActivity: new Date(),
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
            FINGERPRINT,
            lastActivity: {$gte: renewDate}
        }, {
            $set: {
                FINGERPRINT,
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
                FINGERPRINT,
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


function runActivityQueue(tickTimeInSeconds, marginTimeForRenew, isInit = false) {
    if (isInit &&  this._timeout !== null) {
        // there is only one loop for activity per process
        return _stop.bind(this);
    }
    const doTick = async () => {
        const wasMaster = this._isMaster;
        try {
            if (wasMaster) {
                this._isMaster = await renewingMasterReservation.call(this, tickTimeInSeconds, marginTimeForRenew);
            } else {
                this._isMaster = await tryBeMaster.call(this, tickTimeInSeconds, marginTimeForRenew, isInit);
            }
            await oneHeartbeat.call(this, tickTimeInSeconds);
        } catch (err) {
            console.error('ActivityQueue:', err);
        }
        finally {
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
    }
    return _stop.bind(this);
}


