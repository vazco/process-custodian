import {expect} from 'chai';
const {describe, it} = global;

describe('test 1', () => {
    it('case 1', () => {
        expect('ala').to.be.typeof('string');
    });
});
