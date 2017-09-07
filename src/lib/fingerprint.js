import os from 'os';

/**
 * Collision-resistant small id of process optimized for horizontal scaling and binary search lookup performance.
 * Fingerprint of process is based on a hash of hostname + pid + random.
 * Original concept taken from cuid
 */


const pid = parseInt(process.pid, 10);
const padding = 2;

const randomized = pad(parseInt(Math.random() * 1000000000).toString(36), padding);

function pad (num, size) {
    const s = '000000000' + num;
    return s.substr(s.length - size);
}

const length = os.hostname().length;

const hostname = os.hostname().split('').reduce(function (prev, char) {
    return +prev + char.charCodeAt(0);
}, + length + 36).toString(36);

const hostId = pad(hostname, padding);


// Optimized for binary search lookup performance
export const FINGERPRINT = hostId + pad(pid.toString(36), padding) + randomized;
// Optimize for human
export function humanize (fingerprint) {
    return fingerprint.match(/.{2}/g).join('-');
}




