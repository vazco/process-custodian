# Process Custodian

This package helps with organizing of tasks between few instances of same app, It can identify processes and track them activity.

## Installation
```#bash

npm install process-custodian --save
```

## How it works

This package gives collision-resistant fingerprint for each process.
Process fingerprint has 6 char length with structure: (hostname - pid - random).
So, It is optimized for horizontal scaling and binary search lookup performance.


After create new instance of `ProcessCustodian`, this package saves a heartbeat of process
to the passed raw mongodb collection with frequency about `tickTimeInSeconds` (which default is 60s)


First of processes, which will be able to reserve self as a master, 
will be the master process to the moment of dead 
or lose master role if will be too busy to save in database a heartbeat at the time.

## Example of use - with pure mongodb collection
```#js
import ProcessCustodian from  'process-custodian';
import {MongoClient}  from 'mongodb'

MongoClient.connect('mongodb://localhost:27017/test', function(err, db) {

  // Create a collection we want to drop later
  const collection = db.collection('process_custodian');

  const handle = new ProcessCustodian({rawCollection: collection, tickTimeInSeconds: 60});

  const stopOnTick = handle.onTick(() => {
    console.log('tick', handle.isMaster() ? 'master': 'slave')
  });
  
  handle.onIAmNewMaster(() => {
    console.log('I am master');
  });
  
  handle.onIAmSlave(() => {
    console.log('I am slave');
  });

```

## Example of use - with meteor collection

```#js
import ProcessCustodian from  'process-custodian';
// for meteor:
const collection = new Mongo.Collection('process_custodian');

const handle = new ProcessCustodian({
    rawCollection: collection.rawCollection(),
    tickTimeInSeconds: 60
    marginTimeForRenew = 10
});

handle.onceTick(() => {
    console.log('tick', handle.isMaster() ? 'master': 'slave')
});
  
handle.onIAmNewMaster(() => {
    console.log('I am master');
});
  
handle.onIAmSlave(() => {
    console.log('I am slave');
});

// if no necessery any more 
handle.stop();

```

## Help tools

```
import {getFingerprint, humanize} from  'process-custodian';

//Getting fingerprint
console.log('id:', getFingerprint()); // e.g. output: id: ji4fmf
console.log('human:', humanize(getFingerprint())); // e.g. output: human: ji-4f-mf
```





