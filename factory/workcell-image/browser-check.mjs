// Controller-owned functional browser acceptance; generated workers cannot edit this file.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
const reportPath = "/tmp/factory-browser/browser-acceptance.json";
const report = {
  ok: false,
  checks: [],
  errors: [],
  screenshots: [],
  startedAt: new Date().toISOString(),
};
let browser, page;
let cancelNextDialog = false;
const check = (name) => report.checks.push(name);
async function visible(locator) {
  const count = await locator.count();
  for (let i = 0; i < count; i++)
    if (await locator.nth(i).isVisible()) return locator.nth(i);
  return null;
}
async function waitVisible(locator) {
  const stop = Date.now() + 8000;
  do {
    const match = await visible(locator);
    if (match) return match;
    await new Promise((r) => setTimeout(r, 100));
  } while (Date.now() < stop);
  return null;
}
async function button(pattern, root = page) {
  const target = await waitVisible(root.getByRole("button", { name: pattern }));
  if (!target) throw Error(`No visible accessible button matching ${pattern}`);
  await target.click();
}
async function field(pattern, root = page) {
  const target = await waitVisible(root.getByLabel(pattern));
  if (!target) throw Error(`No visible accessible field matching ${pattern}`);
  return target;
}
async function optionalButton(pattern) {
  const target = await visible(page.getByRole("button", { name: pattern }));
  if (target) await target.click();
}
async function input(pattern, value, root = page) {
  await (await field(pattern, root)).fill(value);
}
async function select(pattern, value, root = page) {
  await (await field(pattern, root)).selectOption(value);
}
async function waitFor(predicate, message) {
  const stop = Date.now() + 10000;
  while (Date.now() < stop) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error(message);
}
try {
  await mkdir(path.dirname(reportPath), { recursive: true });
  const base = "http://127.0.0.1:4381";
  const launch = { headless: true, chromiumSandbox: false };
  browser = await chromium.launch(launch);
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(8000);
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("dialog", (dialog) => {
    const cancel = cancelNextDialog;
    cancelNextDialog = false;
    return cancel ? dialog.dismiss() : dialog.accept();
  });
  const navigation = await page.goto(base, { waitUntil: "networkidle" });
  assert.equal(
    navigation?.status(),
    200,
    "Application root must return HTTP 200",
  );
  assert.match(
    navigation.headers()["content-type"] || "",
    /text\/html/i,
    "Application root must serve HTML",
  );
  check("Application served and loaded");
  const hiddenAlerts = page.locator('[role="alert"][hidden]');
  for (let i = 0; i < (await hiddenAlerts.count()); i++)
    assert.equal(
      await hiddenAlerts.nth(i).isVisible(),
      false,
      "Alert with hidden attribute must not be visible",
    );
  check("Hidden alert regions stay hidden");
  const api = async (endpoint) => {
    const r = await fetch(base + endpoint);
    assert.equal(r.status, 200);
    return r.json();
  };
  // All mutations below use actual visible browser controls; API reads only assert resulting persistence.
  await optionalButton(/^(new|add|create) project$/i);
  await input(/^(project )?name(?:\s*\*)?$/i, "Browser QA");
  await button(/^(create|add|save)( project)?$/i);
  await waitFor(
    async () =>
      (await api("/api/projects")).some((p) => p.name === "Browser QA"),
    "Project creation did not persist",
  );
  const project = (await api("/api/projects")).find(
    (p) => p.name === "Browser QA",
  );
  check("Create project through UI");
  const filter = await visible(
    page.getByRole("combobox", { name: /project/i }),
  );
  assert(filter, "No accessible project filter");
  await filter.selectOption(String(project.id));
  check("Select project filter");
  await optionalButton(/^(new|add|create) task$/i);
  await input(/^(task )?title(?:\s*\*)?$/i, "Browser acceptance task");
  await input(/^assignee$/i, "QA Operator");
  await select(/^priority$/i, "high");
  const taskDialog = await visible(page.getByRole("dialog"));
  const projectField = taskDialog
    ? await visible(taskDialog.getByRole("combobox", { name: /^project$/i }))
    : null;
  if (projectField) await projectField.selectOption(String(project.id));
  await button(/^(create|add|save)( task)?$/i);
  await waitFor(
    async () =>
      (await api("/api/tasks")).some(
        (t) => t.title === "Browser acceptance task",
      ),
    "Task creation did not persist",
  );
  await page
    .getByText("Browser acceptance task", { exact: true })
    .first()
    .waitFor({ state: "visible" });
  let task = (await api("/api/tasks")).find(
    (t) => t.title === "Browser acceptance task",
  );
  assert.equal(task.priority, "high");
  assert.equal(task.assignee, "QA Operator");
  assert.equal(task.projectId, project.id);
  check("Create task with priority and assignment through UI");
  // There is only one task in this isolated database, making its edit action unambiguous.
  const edit = await visible(page.getByRole("button", { name: /edit task/i }));
  if (edit) await edit.click();
  else {
    const card = page
      .locator("article, [data-task-id], .task-card, .task")
      .filter({ hasText: "Browser acceptance task" })
      .first();
    if (await card.count()) await button(/^edit(?:\s|$)/i, card);
    else await button(/^edit$/i);
  }
  await input(/^(task )?title(?:\s*\*)?$/i, "Browser edited task");
  await select(/^status$/i, "doing");
  await button(/^(save|update)( task| changes)?$/i);
  await waitFor(
    async () =>
      (await api("/api/tasks")).some(
        (t) => t.title === "Browser edited task" && t.status === "doing",
      ),
    "Task edit/status move did not persist",
  );
  await page
    .getByText("Browser edited task", { exact: true })
    .first()
    .waitFor({ state: "visible" });
  check("Edit task and move to doing through UI");
  await page.reload({ waitUntil: "networkidle" });
  await page
    .getByRole("combobox", { name: /project/i })
    .first()
    .selectOption(String(project.id));
  assert(
    (await page.getByText("Browser edited task", { exact: true }).count()) > 0,
    "Edited task absent after page reload",
  );
  check("Reload retains edited task");
  const activity = await api(`/api/activity?projectId=${project.id}`);
  assert(activity.length >= 3, "Missing activity records");
  assert(
    (await page.getByText(/activity/i).count()) > 0,
    "No visible activity history heading",
  );
  check("Activity recorded and history presented");

  // Hold the older project's real responses until the newest selection is rendered.
  // This proves ordering, rather than hoping two fast localhost requests race.
  await button(/^(new|add|create) project$/i);
  await input(/^(project )?name(?:\s*\*)?$/i, "Filter race latest");
  await button(/^(create|add|save)( project)?$/i);
  await waitFor(async () => (await api('/api/projects')).some(p => p.name === 'Filter race latest'), 'Second project did not persist');
  const latestProject = (await api('/api/projects')).find(p => p.name === 'Filter race latest');
  const projectFilter = page.getByRole('combobox', {name:/project/i}).first();
  await projectFilter.selectOption(String(latestProject.id));
  await page.waitForLoadState('networkidle');
  const held = new Set();
  const delivered = [];
  let releaseOld;
  const oldGate = new Promise(resolve => { releaseOld = resolve; });
  const routePattern = '**/api/**';
  const delayOld = async route => {
    const url = new URL(route.request().url());
    if (!['/api/tasks', '/api/activity'].includes(url.pathname) || url.searchParams.get('projectId') !== String(project.id)) return route.continue();
    const response = await route.fetch();
    held.add(url.pathname);
    await oldGate;
    try { await route.fulfill({response}); } catch (error) {
      // AbortController-based fixes may cancel the superseded request.
      if (!/closed|cancel|abort|Invalid Interception/i.test(String(error))) throw error;
    }
    delivered.push(url.pathname);
  };
  await page.route(routePattern, delayOld);
  try {
    await projectFilter.selectOption(String(project.id));
    await waitFor(() => held.size === 2, 'Did not hold both older task and activity responses');
    await projectFilter.selectOption(String(latestProject.id));
    const activityList = page.locator('#activity-list');
    await waitFor(async () => (await activityList.innerText()).includes('Filter race latest'), 'Latest project activity did not render');
    assert.equal(await page.getByText('Browser edited task', {exact:true}).count(), 0, 'Old project task visible before delayed response');
    const latestActivity = await activityList.innerText();
    releaseOld();
    await waitFor(() => delivered.length === 2, 'Older responses were not released');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await projectFilter.inputValue(), String(latestProject.id), 'Latest project selection changed');
    assert.equal(await page.getByText('Browser edited task', {exact:true}).count(), 0, 'Delayed old response overwrote latest project tasks');
    assert.equal(await activityList.innerText(), latestActivity, 'Delayed old response overwrote latest project activity');
    report.filterRaceRegression = {held:[...held], delivered, latestProjectId:latestProject.id, staleTaskAbsent:true, latestActivityPreserved:true};
    check('Rapid project changes discard delayed older task and activity responses');
  } finally {
    releaseOld();
    await page.unroute(routePattern, delayOld);
  }
  await button(/^delete project$/i);
  const raceConfirmation = await visible(page.getByRole('dialog'));
  if (raceConfirmation) await button(/^delete$/i, raceConfirmation);
  await waitFor(async () => !(await api('/api/projects')).some(p => p.id === latestProject.id), 'Second project cleanup did not persist');
  await projectFilter.selectOption(String(project.id));
  await page.getByText('Browser edited task', {exact:true}).first().waitFor({state:'visible'});
  const screenshot = reportPath.replace(/\.json$/, "") + "-desktop.png";
  await page.screenshot({ path: screenshot, fullPage: true });
  report.screenshots.push(screenshot);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Horizontal page overflow at 390px",
  );
  check("Responsive layout at 390px");
  const mobile = reportPath.replace(/\.json$/, "") + "-mobile.png";
  await page.screenshot({ path: mobile, fullPage: true });
  report.screenshots.push(mobile);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await button(/^edit project$/i);
  await input(/^(project )?name(?:\s*\*)?$/i, "Renamed browser project");
  await button(/^(save|update)( project| changes)?$/i);
  await waitFor(
    async () =>
      (await api("/api/projects")).some(
        (p) => p.id === project.id && p.name === "Renamed browser project",
      ),
    "Project rename did not persist",
  );
  check("Rename project through UI");
  const finalCard = page
    .locator("article, [data-task-id], .task-card, .task")
    .filter({ hasText: "Browser edited task" })
    .first();
  const editTask = await visible(
    page.getByRole("button", { name: /edit task/i }),
  );
  if (editTask) await editTask.click();
  else if (await finalCard.count()) await button(/^edit(?:\s|$)/i, finalCard);
  else await button(/^edit$/i);
  await select(/^priority$/i, "low");
  await select(/^status$/i, "done");
  await button(/^(save|update)( task| changes)?$/i);
  await waitFor(
    async () =>
      (await api("/api/tasks")).some(
        (t) => t.id === task.id && t.priority === "low" && t.status === "done",
      ),
    "Priority/status change did not persist",
  );
  check("Change priority and status through UI");
  const deleteTask = await visible(
    page.getByRole("button", { name: /delete task/i }),
  );
  if (deleteTask) await deleteTask.click();
  else {
    const card = page
      .locator("article, [data-task-id], .task-card, .task")
      .filter({ hasText: "Browser edited task" })
      .first();
    if (await card.count()) await button(/^delete(?:\s|$)/i, card);
    else await button(/^delete$/i);
  }
  const taskConfirmation = await visible(page.getByRole("dialog"));
  if (taskConfirmation) await button(/^delete$/i, taskConfirmation);
  await waitFor(
    async () => !(await api("/api/tasks")).some((t) => t.id === task.id),
    "Task deletion did not persist",
  );
  check("Delete task through UI");
  report.cancellationRegression = {
    afterConfirmedDeletion: await page
      .locator("dialog")
      .evaluateAll((nodes) =>
        nodes.map((n) => ({
          id: n.id,
          open: n.open,
          returnValue: n.returnValue,
        })),
      ),
  };
  // Regression: a prior confirmed deletion must not turn Escape into confirmation.
  await button(/^(new|add|create) task$/i);
  await input(/^(task )?title(?:\s*\*)?$/i, "Cancellation sentinel");
  await button(/^(create|add|save)( task)?$/i);
  await waitFor(
    async () =>
      (await api("/api/tasks")).some(
        (t) => t.title === "Cancellation sentinel",
      ),
    "Sentinel task creation did not persist",
  );
  const tasksBeforeCancel = await api("/api/tasks");
  cancelNextDialog = true;
  await button(/^delete project$/i);
  const cancelConfirmation = await visible(page.getByRole("dialog"));
  if (cancelConfirmation) {
    report.cancellationRegression.beforeEscape =
      await cancelConfirmation.evaluate((n) => ({
        id: n.id,
        open: n.open,
        returnValue: n.returnValue,
      }));
    await page.keyboard.press("Escape");
    await cancelConfirmation.waitFor({ state: "hidden" });
    report.cancellationRegression.afterEscape = await page
      .locator("dialog")
      .evaluateAll((nodes) =>
        nodes.map((n) => ({
          id: n.id,
          open: n.open,
          returnValue: n.returnValue,
        })),
      );
  }
  cancelNextDialog = false;
  await page.waitForTimeout(500);
  assert(
    (await api("/api/projects")).some((p) => p.id === project.id),
    "Escape after prior confirmed deletion must preserve the project",
  );
  assert.deepEqual(
    await api("/api/tasks"),
    tasksBeforeCancel,
    "Escape must preserve every remaining task",
  );
  check(
    "Cancel project deletion after confirmed task deletion preserves project and tasks",
  );
  await button(/^delete project$/i);
  const projectConfirmation = await visible(page.getByRole("dialog"));
  if (projectConfirmation) await button(/^delete$/i, projectConfirmation);
  await waitFor(
    async () => !(await api("/api/projects")).some((p) => p.id === project.id),
    "Project deletion did not persist",
  );
  check("Delete project through UI");
  assert.deepEqual(report.errors, [], "Browser JavaScript errors");
  check("No uncaught browser errors");
  report.ok = true;
} catch (error) {
  report.failure = String(error.stack || error);
  if (page) {
    try {
      const failure = reportPath.replace(/\.json$/, "") + "-failure.png";
      await page.screenshot({ path: failure, fullPage: true });
      report.screenshots.push(failure);
      report.visibleControls = await page
        .locator("button,input,select,label")
        .evaluateAll((nodes) =>
          nodes.map((n) => ({
            tag: n.tagName,
            text: n.textContent?.slice(0, 120),
            ariaLabel: n.getAttribute("aria-label"),
            id: n.id,
            type: n.getAttribute("type"),
          })),
        );
    } catch {}
  }
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  await browser?.close();
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
