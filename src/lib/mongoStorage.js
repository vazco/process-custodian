import {MASTER_KEY, EVENTS} from './constants';
import {FINGERPRINT} from  './fingerprint';
import EventEmitter from 'events';
import os from 'os';


const processStartAt = new Date();

const pid = parseInt(process.pid, 10);
const hostName = os.hostname();
let collection = null;
let _isMaster = false;
let emitter = null;


/**
 *
 * @param rawCollection
 * @param tickTimeInSeconds: Number
 * @returns {{isMaster: function, stop: function, onTick: function, onIAmNewMaster: function, onIAmSlave: function}}
 */
export function init ({rawCollection, tickTimeInSeconds = 60}) {
    emitter = new EventEmitter();
    collection = rawCollection;
    ensureIndexExist(tickTimeInSeconds);
    const stop = runActivityQueue(tickTimeInSeconds, true);
    const handler = {
        isMaster,
        stop
    };
    // preparing methods onTick, onIAmNewMaster, onIAmSlave
    Object.values(EVENTS).forEach(key => handler[`on${key}`] = (fn => {
        emitter.on(key, fn);
        return () => emitter.removeListener(fn);
    }));
    // once
    Object.values(EVENTS).forEach(key => handler[`once${key}`] = (fn => {
        emitter.once(key, fn);
    }));
    return handler;
}

function isMaster () {
    return _isMaster;
}


async function ensureIndexExist (tickTimeInSeconds) {
    if (!await collection.indexExists('ttl')) {
        await collection.createIndex({lastActivity: -1}, {
            name: 'ttl',
            expireAfterSeconds: tickTimeInSeconds * 3
        })
    }
}

async function oneHeartbeat () {
    try {
        const result = await collection.updateOne({_id: FINGERPRINT}, {
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

async function renewingMasterReservation (tickTime) {
    const renewDate = new Date();
    renewDate.setSeconds(renewDate.getSeconds() - (tickTime * 2));
    try {
        const result = await collection.updateOne({
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
        return result.upsertedCount || result.modifiedCount;
    } catch (err) {
        console.error('ActivityQueue[renewingMasterReservation]:', err);
    }
    return false;
}

async function tryBeMaster (tickTime, isInit) {
    try {
        // check if you can be first master
        let result = await collection.updateOne({
            // if no active master
            _id: MASTER_KEY,
        }, {
            $setOnInsert: {_id: MASTER_KEY}
        }, {
            upsert: true
        });
        if (result.upsertedCount) {
            return true;
        }
        const deathDate = new Date();
        // no active master or last one is too busy to be master
        deathDate.setSeconds(deathDate.getSeconds() - (tickTime * (isInit? 2 : 3)));
        result = await collection.updateOne({
            // if no active master
            _id: MASTER_KEY,
            lastActivity: {$lte: deathDate}
        }, {
            $set: {
                FINGERPRINT,
                lastActivity: new Date()
            }
        });
        return result.upsertedCount || result.modifiedCount;
    } catch (err) {
        console.error('ActivityQueue[tryBeMaster]:', err);
    }
    return false;
}

let timeout = null;

const _stop = () => {
    if (timeout !== null) {
        clearTimeout(timeout);
        timeout = null;
    }
};

function runActivityQueue(tickTimeInSeconds, isInit = false) {
    if (isInit &&  timeout !== null) {
        // there is only one loop for activity per process
        return _stop;
    }
    timeout = setTimeout(async () => {
        const wasMaster = _isMaster;
        try {
            if (wasMaster) {
                _isMaster = await renewingMasterReservation(tickTimeInSeconds);
            } else {
                _isMaster = await tryBeMaster(tickTimeInSeconds, isInit);
            }
            await oneHeartbeat(tickTimeInSeconds);
        } catch (err) {
            console.error('ActivityQueue:', err);
        }
        finally {
            runActivityQueue(tickTimeInSeconds);
            emitter.emit(EVENTS.TICK);
            if (!wasMaster && _isMaster) {
                emitter.emit(EVENTS.I_AM_MASTER);
            }
            if ((wasMaster || isInit) && !_isMaster) {
                emitter.emit(EVENTS.I_AM_SLAVE);
            }
        }
    }, isInit ? 0 : tickTimeInSeconds * 1000);

    return _stop;
}


