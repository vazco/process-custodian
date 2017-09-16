import {stub} from 'sinon';
export const mockCollection = extend => ({
    indexExists: stub(),
    createIndex: stub(),
    find: stub(),
    updateOne: stub().returns({upsertedCount: 1, modifiedCount: 0}),
    insert: stub(),
    deleteOne: stub()
});
