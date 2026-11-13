const $ = (selector, root = document) => root.querySelector(selector);
const state = { projects: [], tasks: [], activity: [], selectedProjectId: 'all', loadingTasks: false, loadingActivity: false, busy: false };
const statusNames = { todo: 'To do', doing: 'Doing', done: 'Done' };
const actionNames = { 'project.created': 'Project created', 'project.updated': 'Project updated', 'task.created': 'Task created', 'task.updated': 'Task updated', 'task.deleted': 'Task deleted' };
let returnFocus = null;
let confirmation = null;
let workspaceRequestGeneration = 0;

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: options.body ? { 'Content-Type': 'application/json' } : undefined });
  if (response.status === 204) return null;
  let body;
  try { body = await response.json(); } catch { throw new Error('The server returned an unreadable response.'); }
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}).`);
  return body;
}

function showError(error) {
  $('#error-text').textContent = error instanceof Error ? error.message : String(error);
  $('#error-banner').hidden = false;
}
function clearError() { $('#error-banner').hidden = true; $('#error-text').textContent = ''; }
function announce(message = '') { $('#global-status').textContent = message; }
function selectedProject() { return state.projects.find(project => project.id === Number(state.selectedProjectId)); }
function projectName(id) { return state.projects.find(project => project.id === id)?.name || `Project ${id}`; }
function setBusy(busy, message = '') {
  state.busy = busy;
  document.querySelectorAll('button, select').forEach(element => { if (!element.closest('dialog') || !element.classList.contains('dialog-close')) element.disabled = busy; });
  if (message) announce(message);
  renderControls();
}

async function loadProjects(preferredId) {
  state.projects = await api('/api/projects');
  const candidate = preferredId ?? state.selectedProjectId;
  if (candidate === 'all') state.selectedProjectId = 'all';
  else if (state.projects.some(project => project.id === Number(candidate))) state.selectedProjectId = String(candidate);
  else state.selectedProjectId = state.projects[0] ? String(state.projects[0].id) : 'all';
  renderProjectFilter();
}

async function loadWorkspace() {
  const generation = ++workspaceRequestGeneration;
  const selectedProjectId = state.selectedProjectId;
  state.loadingTasks = true; state.loadingActivity = true; renderWorkspace();
  const suffix = selectedProjectId === 'all' ? '' : `?projectId=${encodeURIComponent(selectedProjectId)}`;
  try {
    const [tasks, activity] = await Promise.all([api(`/api/tasks${suffix}`), api(`/api/activity${suffix}`)]);
    if (generation !== workspaceRequestGeneration || state.selectedProjectId !== selectedProjectId) return;
    state.tasks = tasks; state.activity = activity;
  } catch (error) {
    if (generation !== workspaceRequestGeneration || state.selectedProjectId !== selectedProjectId) return;
    showError(error); state.tasks = []; state.activity = [];
  } finally {
    if (generation === workspaceRequestGeneration && state.selectedProjectId === selectedProjectId) {
      state.loadingTasks = false; state.loadingActivity = false; renderWorkspace();
    }
  }
}

async function refresh(preferredId, message) {
  clearError();
  try { await loadProjects(preferredId); await loadWorkspace(); if (message) announce(message); }
  catch (error) { showError(error); }
}

function renderProjectFilter() {
  const filter = $('#project-filter');
  filter.replaceChildren();
  const all = document.createElement('option'); all.value = 'all'; all.textContent = 'All projects'; filter.append(all);
  state.projects.forEach(project => { const option = document.createElement('option'); option.value = String(project.id); option.textContent = project.name; filter.append(option); });
  filter.value = state.selectedProjectId;
  renderControls();
}

function renderControls() {
  const hasSelected = Boolean(selectedProject());
  $('#new-task').disabled = state.busy || !hasSelected;
  $('#edit-project').disabled = state.busy || !hasSelected;
  $('#delete-project').disabled = state.busy || !hasSelected;
  $('#new-project').disabled = state.busy;
  $('#project-filter').disabled = state.busy;
}

function renderWorkspace() {
  const project = selectedProject();
  $('#workspace-heading').textContent = project ? project.name : (state.projects.length ? 'All projects' : 'No projects yet');
  $('#project-description').textContent = project ? (project.description || 'No project description.') : (state.projects.length ? 'Tasks and activity across the workspace.' : 'Create a project to begin tracking work.');
  $('#board-loading').hidden = !state.loadingTasks;
  $('#board').hidden = state.loadingTasks || state.tasks.length === 0;
  $('#board-empty').hidden = state.loadingTasks || state.tasks.length > 0;
  $('#board-empty').textContent = state.projects.length === 0 ? 'Create a project, then add its first task.' : 'No tasks in this view.';
  $('#task-count').textContent = `${state.tasks.length} task${state.tasks.length === 1 ? '' : 's'}`;
  ['todo', 'doing', 'done'].forEach(status => renderColumn(status));
  renderActivity(); renderControls();
}

function renderColumn(status) {
  const tasks = state.tasks.filter(task => task.status === status);
  const list = $(`#${status}-list`); list.replaceChildren();
  $(`#${status}-count`).textContent = String(tasks.length);
  tasks.forEach(task => list.append(createTaskCard(task)));
}

function createTaskCard(task) {
  const card = $('#task-template').content.firstElementChild.cloneNode(true);
  card.dataset.taskId = String(task.id);
  const priority = $('.priority', card); priority.textContent = `${task.priority} priority`; priority.classList.add(task.priority);
  $('.project-tag', card).textContent = projectName(task.projectId);
  $('h4', card).textContent = task.title;
  const description = $('.task-description', card); description.textContent = task.description; description.hidden = !task.description;
  $('.assignee', card).textContent = task.assignee ? `Assigned to ${task.assignee}` : 'Unassigned';
  const previous = $('.move-prev', card); const next = $('.move-next', card);
  const order = ['todo', 'doing', 'done']; const index = order.indexOf(task.status);
  previous.hidden = index === 0; next.hidden = index === order.length - 1;
  if (index > 0) { previous.textContent = `Move to ${statusNames[order[index - 1]]}`; previous.setAttribute('aria-label', `Move ${task.title} to ${statusNames[order[index - 1]]}`); previous.addEventListener('click', () => moveTask(task, order[index - 1])); }
  if (index < 2) { next.textContent = `Move to ${statusNames[order[index + 1]]}`; next.setAttribute('aria-label', `Move ${task.title} to ${statusNames[order[index + 1]]}`); next.addEventListener('click', () => moveTask(task, order[index + 1])); }
  const edit = $('.edit-task', card); edit.setAttribute('aria-label', `Edit ${task.title}`); edit.addEventListener('click', event => openTaskDialog(task, event.currentTarget));
  const remove = $('.delete-task', card); remove.setAttribute('aria-label', `Delete ${task.title}`); remove.addEventListener('click', event => requestDeleteTask(task, event.currentTarget));
  return card;
}

function renderActivity() {
  $('#activity-loading').hidden = !state.loadingActivity;
  const list = $('#activity-list'); list.replaceChildren();
  $('#activity-empty').hidden = state.loadingActivity || state.activity.length > 0;
  if (state.loadingActivity) return;
  state.activity.forEach(entry => {
    const item = document.createElement('li');
    const action = document.createElement('span'); action.className = 'activity-action'; action.textContent = actionNames[entry.action] || entry.action;
    const meta = document.createElement('span'); meta.className = 'activity-meta'; meta.textContent = `${projectName(entry.projectId)}${entry.taskId == null ? '' : ` · Task ${entry.taskId}`}`;
    const time = document.createElement('time'); time.className = 'activity-time'; time.dateTime = entry.createdAt;
    const date = new Date(entry.createdAt); time.textContent = Number.isNaN(date.valueOf()) ? entry.createdAt : date.toLocaleString();
    item.append(action, meta, time); list.append(item);
  });
}

function openDialog(dialog, focusTarget, trigger) {
  returnFocus = trigger || document.activeElement;
  dialog.showModal(); requestAnimationFrame(() => focusTarget.focus());
}
function closeDialog(dialog) { dialog.close(); if (returnFocus?.isConnected) returnFocus.focus(); returnFocus = null; }
function bindDialog(dialog) {
  $('.dialog-close', dialog)?.addEventListener('click', () => closeDialog(dialog));
  $('.dialog-cancel', dialog)?.addEventListener('click', () => closeDialog(dialog));
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); });
  dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(dialog); });
}

function openProjectDialog(project, trigger) {
  $('#project-dialog-title').textContent = project ? 'Edit project' : 'New project';
  $('#project-id').value = project?.id || ''; $('#project-name').value = project?.name || ''; $('#project-description-input').value = project?.description || ''; $('#project-form-error').textContent = '';
  openDialog($('#project-dialog'), $('#project-name'), trigger);
}
function openTaskDialog(task, trigger) {
  if (!task && !selectedProject()) return;
  $('#task-dialog-title').textContent = task ? 'Edit task' : 'New task';
  $('#task-id').value = task?.id || ''; $('#task-title').value = task?.title || ''; $('#task-description').value = task?.description || ''; $('#task-status').value = task?.status || 'todo'; $('#task-priority').value = task?.priority || 'medium'; $('#task-assignee').value = task?.assignee || ''; $('#task-form-error').textContent = '';
  openDialog($('#task-dialog'), $('#task-title'), trigger);
}

async function submitProject(event) {
  event.preventDefault(); const id = $('#project-id').value; const name = $('#project-name').value.trim();
  if (!name) { $('#project-form-error').textContent = 'Enter a project name.'; $('#project-name').focus(); return; }
  const body = { name, description: $('#project-description-input').value };
  try {
    setBusy(true, 'Saving project…');
    const project = await api(id ? `/api/projects/${id}` : '/api/projects', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(body) });
    closeDialog($('#project-dialog')); await refresh(project.id, id ? 'Project updated.' : 'Project created.');
  } catch (error) { $('#project-form-error').textContent = error.message; }
  finally { setBusy(false); }
}

async function submitTask(event) {
  event.preventDefault(); const id = $('#task-id').value; const title = $('#task-title').value.trim();
  if (!title) { $('#task-form-error').textContent = 'Enter a task title.'; $('#task-title').focus(); return; }
  const body = { title, description: $('#task-description').value, status: $('#task-status').value, priority: $('#task-priority').value, assignee: $('#task-assignee').value };
  if (!id) body.projectId = Number(state.selectedProjectId);
  try {
    setBusy(true, 'Saving task…');
    await api(id ? `/api/tasks/${id}` : '/api/tasks', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(body) });
    closeDialog($('#task-dialog')); await loadWorkspace(); announce(id ? 'Task updated.' : 'Task created.');
  } catch (error) { $('#task-form-error').textContent = error.message; }
  finally { setBusy(false); }
}

async function moveTask(task, status) {
  clearError(); setBusy(true, `Moving ${task.title}…`);
  try { await api(`/api/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await loadWorkspace(); announce(`${task.title} moved to ${statusNames[status]}.`); }
  catch (error) { showError(error); }
  finally { setBusy(false); }
}

function askConfirmation({ title, message, trigger, action }) {
  const dialog = $('#confirm-dialog');
  $('#confirm-title').textContent = title; $('#confirm-message').textContent = message; confirmation = action; returnFocus = trigger;
  dialog.returnValue = 'cancel';
  dialog.showModal(); requestAnimationFrame(() => $('#confirm-cancel').focus());
}
function requestDeleteTask(task, trigger) { askConfirmation({ title: 'Delete task?', message: `Delete “${task.title}”? Its deletion remains visible in activity history.`, trigger, action: () => deleteTask(task) }); }
function requestDeleteProject(project, trigger) { askConfirmation({ title: 'Delete project?', message: `Delete “${project.name}” and all of its tasks and activity? This cannot be undone.`, trigger, action: () => deleteProject(project) }); }
async function deleteTask(task) {
  setBusy(true, `Deleting ${task.title}…`);
  try { await api(`/api/tasks/${task.id}`, { method: 'DELETE' }); await loadWorkspace(); announce('Task deleted.'); }
  catch (error) { showError(error); }
  finally { setBusy(false); }
}
async function deleteProject(project) {
  setBusy(true, `Deleting ${project.name}…`);
  try { await api(`/api/projects/${project.id}`, { method: 'DELETE' }); await refresh('all', 'Project deleted.'); }
  catch (error) { showError(error); }
  finally { setBusy(false); }
}

$('#project-filter').addEventListener('change', async event => { state.selectedProjectId = event.target.value; clearError(); renderControls(); await loadWorkspace(); });
$('#new-project').addEventListener('click', event => openProjectDialog(null, event.currentTarget));
$('#edit-project').addEventListener('click', event => { const project = selectedProject(); if (project) openProjectDialog(project, event.currentTarget); });
$('#delete-project').addEventListener('click', event => { const project = selectedProject(); if (project) requestDeleteProject(project, event.currentTarget); });
$('#new-task').addEventListener('click', event => openTaskDialog(null, event.currentTarget));
$('#dismiss-error').addEventListener('click', clearError);
$('#project-form').addEventListener('submit', submitProject); $('#task-form').addEventListener('submit', submitTask);
bindDialog($('#project-dialog')); bindDialog($('#task-dialog'));
$('#confirm-cancel').addEventListener('click', event => {
  event.preventDefault();
  $('#confirm-dialog').close('cancel');
});
$('#confirm-dialog').addEventListener('cancel', event => {
  event.preventDefault();
  $('#confirm-dialog').close('cancel');
});
$('#confirm-dialog').addEventListener('close', async () => { const action = confirmation; const confirmed = $('#confirm-dialog').returnValue === 'confirm'; confirmation = null; if (returnFocus?.isConnected) returnFocus.focus(); returnFocus = null; if (confirmed && action) await action(); });

(async function init() {
  announce('Loading workspace…');
  try { await loadProjects('all'); await loadWorkspace(); announce('Workspace ready.'); }
  catch (error) { showError(error); announce('Unable to load workspace.'); renderWorkspace(); }
})();