// Generated backend and frontend execute only inside the verified Workcell lease.
import path from 'node:path';
import fs from 'node:fs/promises';
import { startIsolatedApp } from './workcell.mjs';
const appDir = path.resolve(process.argv[2]);
const reportPath = path.resolve(process.argv[3] || 'browser-acceptance.json');
const lease = await startIsolatedApp(appDir, { evidenceDir: reportPath.replace(/\.json$/, '') + '-workcell' });
try {
  const result = await lease.runBrowserCheck(reportPath);
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  report.screenshots = (report.screenshots || []).map(p => reportPath.replace(/\.json$/, '') + path.basename(p).slice('browser-acceptance'.length));
  if (result.code !== 0) report.ok = false;
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  if (!report.ok) process.exitCode = 1;
} finally { await lease.close(); }
