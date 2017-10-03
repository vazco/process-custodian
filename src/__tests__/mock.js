import {stub} from 'sinon';
export const mockCollection = () => ({
    indexExists: stub(),
    createIndex: stub(),
    find: stub(),
    updateOne: stub().returns({upsertedCount: 0, modifiedCount: 0}),
    insert: stub(),
    deleteOne: stub()
});
