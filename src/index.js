import {getFingerprint, humanize} from './lib/fingerprint';
import ProcessCustodian from './lib/ProcessCustodian';


export {
    ProcessCustodian,
    getFingerprint,
    humanize
};

ProcessCustodian.ProcessCustodian = ProcessCustodian;
ProcessCustodian.getFingerprint = getFingerprint;
ProcessCustodian.humanize = humanize;

export default ProcessCustodian;
