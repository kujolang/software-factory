import {qualifyTestSensitivity} from '../factory/test-sensitivity.mjs';
if(process.argv.length!==3||process.argv[2]!=='--live')throw Error('Explicit --live required for actual Workcell acceptance');
const report=await qualifyTestSensitivity();console.log(JSON.stringify({ok:report.ok,directory:report.directory,checks:report.assessment.checks}));if(!report.ok)process.exitCode=1;
