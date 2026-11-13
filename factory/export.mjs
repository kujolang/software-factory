import {exportEvidence} from './evidence.mjs';
if (process.argv.length !== 4) throw Error('Usage: node factory/export.mjs RUN_DIRECTORY NEW_EXPORT_DIRECTORY');
console.log(exportEvidence(process.argv[2], process.argv[3]).destination);
