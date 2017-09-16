import {MASTER_KEY, EVENTS} from '../lib/constants';
import ProcessCustodian from  '../lib/ProcessCustodian';
import {mockCollection} from './mock';
import {mock, useFakeTimers} from 'sinon';
import {expect} from 'chai';
const {describe, it} = global;
const tickTimeInSeconds = 10;
const clock = useFakeTimers();
const porocessCustodian = new ProcessCustodian({
    rawCollection: mockCollection(),
    tickTimeInSeconds,
    marginTimeForRenew: 2
});

describe('lagging', () => {
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
    it('should once called on tick should', () => {
        const exp = mock({once(){}}).expects('once');
        expect(porocessCustodian.onceTick(() => {
            exp.once();
            console.log('Once called onceTick', exp);
        })).to.be.an('undefined');
        clock.tick(90);
        clock.tick(510);
        exp.verify();
        clock.tick(780);
    });
    it('should return a lag value after a little load', function() {
        const ts = Date.now();
        console.log('Start heavy work');
        clock.tick(200001);
        heavyWork(200);
        clock.tick(200001);
        heavyWork(200);
        clock.tick(200001);
        console.log('Stop heavy work');
        const lag = porocessCustodian.getEventLoopLag();
        expect(lag).be.above(1);
    });
});

function heavyWork(duration) {
    let a = 1;
    for (let i = 0; i < 1e7; i++) {
        a = a + 1;
    }
    porocessCustodian.onTick(()=> console.log('time'));
    for (let i = 0; i < 1e7; i++) {
        a = a + 1;
    }
    console.log('a', a);
}
