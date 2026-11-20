// Trusted worker lifecycle only. Candidate execution still uses Workcell's
// separate watchdog and must never rely on this host-process monitor.
import {watchWorkerParent} from './core.mjs';
watchWorkerParent();
