import {MASTER_KEY, EVENTS} from '../lib/constants';
import ProcessCustodian from  '../lib/ProcessCustodian';
import {mockCollection} from './mock';
import {mock, useFakeTimers, stub} from 'sinon';
import {expect, assert} from 'chai';
const {describe, it, beforeEach, afterEach} = global;
const tickTimeInSeconds = 10;

describe('lagging', () => {
    let clock, porocessCustodian, rawCollection;
    beforeEach(() => {
        clock = useFakeTimers({
            now: 0,
            shouldAdvanceTime: true,
            advanceTimeDelta: 1,
            toFake: ['setTimeout', 'clearTimeout', 'Date']
        });
        rawCollection = mockCollection();
        porocessCustodian = new ProcessCustodian({
            rawCollection,
            tickTimeInSeconds,
            marginTimeForRenew: 2
        });
    });

    afterEach(() => {
        clock.restore();
        porocessCustodian.stop();
    });

    it('should be instance of ProcessCustodian', () => {
        expect(porocessCustodian).to.be.instanceof(ProcessCustodian);
        expect(porocessCustodian.getEventLoopLag).to.be.function;
        expect(porocessCustodian.isOverloaded).to.be.function;
        expect(porocessCustodian.onceIAmNewMaster).to.be.function;
        expect(porocessCustodian.onceIAmSlave).to.be.function;
        expect(porocessCustodian.onceTick).to.be.function;
        expect(porocessCustodian.onceStop).to.be.function;
        expect(porocessCustodian.onIAmNewMaster).to.be.function;
        expect(porocessCustodian.onIAmSlave).to.be.function;
        expect(porocessCustodian.onTick).to.be.function;
    });

    it('should return no lag ', () => {
        const noLag = porocessCustodian.getEventLoopLag();
        expect(noLag).be.equal(0);
    });

    it('should once called onceIAmNewMaster', done => {
        rawCollection.updateOne.withArgs({_id: MASTER_KEY}).returns({upsertedCount: 1});
        let iAmNewMasterCount = 0;
        assert.isUndefined(porocessCustodian.onceIAmNewMaster(() => {
            iAmNewMasterCount += 1;
        }));

        clock.runAll();
        execAfterTimes(() => {
            assert.strictEqual(iAmNewMasterCount, 1, 'onceIAmNewMaster should be called only once');
            done();
        }, 10);
    });

    it('should once called onceIAmSlave', done => {
        let iAmSlaveCount = 0;
        assert.isUndefined(porocessCustodian.onceIAmSlave(() => {
            iAmSlaveCount += 1;
        }));

        clock.runAll();
        execAfterTimes(() => {
            assert.strictEqual(iAmSlaveCount, 1, 'onceIAmSlave should be called only once');
            done();
        }, 10);
    });

    it('should once called onIAmNewMaster', done => {
        rawCollection.updateOne.withArgs({_id: MASTER_KEY}).returns({upsertedCount: 1});
        let iAmNewMasterCount = 0;
        assert.isUndefined(porocessCustodian.onceIAmNewMaster(() => {
            iAmNewMasterCount += 1;
        }));
        clock.runAll();
        execAfterTimes(() => {
            assert.isAtLeast(iAmNewMasterCount, 1, 'onceIAmNewMaster should be called at least one');
            done();
        }, 10);
    });

    it('should once called onceTick ', done => {
        let tickCount = 0;
        assert.isUndefined(porocessCustodian.onceTick(() => {
            tickCount += 1;
        }));
        clock.runAll();

        execAfterTimes(() => {
            assert.strictEqual(tickCount, 1, 'should be called only once');
            done();
        }, 5);
    });

    it('should called onIAmSlave callbacks', done => {
        let iAmNewMasterCount = 0;
        assert.isFunction(porocessCustodian.onIAmNewMaster(() => {
            iAmNewMasterCount += 1;
        }), 'Should return stop method');
        let iAmSlaveCount = 0;
        assert.isFunction(porocessCustodian.onIAmSlave(() => {
            iAmSlaveCount += 1;
        }), 'Should return stop method');
        clock.runAll();
        execAfterTimes(() => {
            assert.isAtLeast(iAmNewMasterCount, 0, 'onIAmNewMaster NOT should be called');
            assert.strictEqual(iAmSlaveCount, 1, 'onIAmSlave should be called');
            done();
        }, 5);
    });

    it('should call a few times onTick', done => {
        let tickCount = 0;
        assert.isFunction(porocessCustodian.onTick(() => {
            tickCount += 1;
        }));
        clock.runAll();
        execAfterTimes(() => {
            assert.isAtLeast(tickCount, 2, 'should be called few times');
            done();
        }, 5);
    });

    it('should be a master at the begging and next should be slave and again master', done => {
        const makeMaster = selector => {
            if (selector._id === MASTER_KEY) {
                return {upsertedCount: 1, modifiedCount: 1};
            }
            if (selector._id === porocessCustodian.getFingerprint()) {
                return {upsertedCount: 1, modifiedCount: 1};
            }
        };
        const makeSlave = () => ({upsertedCount: 0, modifiedCount: 0});
        rawCollection.updateOne.callsFake(makeMaster);
        let iAmNewMasterCount = 0;
        assert.isFunction(porocessCustodian.onIAmNewMaster(() => {
            iAmNewMasterCount += 1;
        }), 'Should return stop method');
        let iAmSlaveCount = 0;
        assert.isFunction(porocessCustodian.onIAmSlave(() => {
            iAmSlaveCount += 1;
        }), 'Should return stop method');
        clock.runAll();
        execAfterTimes(() => {
            assert.isOk(porocessCustodian.isMaster(), 'Should be master');
            assert.isAtLeast(iAmNewMasterCount, 1, 'onIAmNewMaster should be called');
            assert.strictEqual(iAmSlaveCount, 0, 'onIAmSlave should NOT be called');
            rawCollection.updateOne.callsFake(makeSlave);
            iAmNewMasterCount = 0;
            iAmSlaveCount = 0;
            execAfterTimes(() => {
                assert.isNotOk(porocessCustodian.isMaster(), 'Should be slave');
                assert.isAtLeast(iAmNewMasterCount, 0, 'onIAmNewMaster should be called');
                assert.strictEqual(iAmSlaveCount, 1, 'onIAmSlave should NOT be called');
                rawCollection.updateOne.callsFake(makeMaster);
                iAmNewMasterCount = 0;
                iAmSlaveCount = 0;
                execAfterTimes(() => {
                    assert.isOk(porocessCustodian.isMaster(), 'Should be master again');
                    assert.isAtLeast(iAmNewMasterCount, 1, 'onIAmNewMaster should NOT be called');
                    assert.strictEqual(iAmSlaveCount, 0, 'onIAmSlave should be called');
                    done();
                }, 2);
            }, 2);

        }, 2);
    });

    it('should return a lag value after a little load', done => {
        let tickTime = 1;
        clock.next();
        execAfterTimes(() => {
            const lag = porocessCustodian.getEventLoopLag();
            assert.isAtLeast(lag, 10, 'EventLoop lag should be at least 10');
            done();
        }, 10, () => {
            porocessCustodian._expectedFiredTime -= tickTime;
            tickTime += 10;
            clock.next();
        });
    });

    function execAfterTimes (cb, times, onTick) {
        if (onTick) {
            onTick();
        } else {
            clock.runAll();
        }
        if (times < 1) {
            cb();
            return;
        }
        process.nextTick(() => execAfterTimes(cb, --times, onTick));
    }
});


