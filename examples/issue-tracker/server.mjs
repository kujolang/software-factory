import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createStore, NotFoundError } from './db.mjs';

const MAX_BODY_BYTES = 64 * 1024;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(HERE, 'public');

const STATIC_ASSETS = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
]);

class HttpError extends Error {
  constructor(status, message, headers = undefined) {
    super(message);
    this.status = status;
    this.headers = headers;
  }
}

function sendJson(response, status, value, headers = undefined) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  response.end(body);
}

function sendEmpty(response, status) {
  response.writeHead(status, { 'X-Content-Type-Options': 'nosniff' });
  response.end();
}

function actualPort(server) {
  const address = server.address();
  return address && typeof address === 'object' ? address.port : null;
}

function enforceHost(request, server) {
  const port = actualPort(server);
  const host = request.headers.host;
  if (
    port === null ||
    typeof host !== 'string' ||
    (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`)
  ) {
    throw new HttpError(400, 'Invalid Host header');
  }
}

function enforceOrigin(request, server) {
  if (!['POST', 'PATCH', 'DELETE'].includes(request.method)) return;
  const origin = request.headers.origin;
  if (origin === undefined) return;
  const port = actualPort(server);
  if (
    typeof origin !== 'string' ||
    (origin !== `http://127.0.0.1:${port}` &&
      origin !== `http://localhost:${port}`)
  ) {
    throw new HttpError(403, 'Origin not allowed');
  }
}

function parseCanonicalId(value, label = 'ID') {
  if (
    typeof value !== 'string' ||
    !/^[1-9][0-9]*$/.test(value) ||
    !Number.isSafeInteger(Number(value))
  ) {
    throw new HttpError(400, `Invalid ${label}`);
  }
  return Number(value);
}

function parseOptionalProjectId(searchParams) {
  const values = searchParams.getAll('projectId');
  for (const key of searchParams.keys()) {
    if (key !== 'projectId') throw new HttpError(400, 'Unknown query parameter');
  }
  if (values.length === 0) return undefined;
  if (values.length !== 1) throw new HttpError(400, 'Invalid projectId');
  return parseCanonicalId(values[0], 'projectId');
}

function assertNoQuery(searchParams) {
  if ([...searchParams.keys()].length !== 0) {
    throw new HttpError(400, 'Query parameters are not allowed');
  }
}

async function readBody(request) {
  const declaredLength = request.headers['content-length'];
  if (declaredLength !== undefined) {
    if (!/^[0-9]+$/.test(declaredLength)) {
      throw new HttpError(400, 'Invalid Content-Length');
    }
    if (Number(declaredLength) > MAX_BODY_BYTES) {
      throw new HttpError(413, 'Request body too large');
    }
  }

  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new HttpError(413, 'Request body too large');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJsonObject(request) {
  const raw = await readBody(request);
  let value;
  try {
    value = JSON.parse(raw.toString('utf8'));
  } catch {
    throw new HttpError(400, 'Malformed JSON');
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'JSON body must be an object');
  }
  return value;
}

function validateFields(body, allowed, required = [], requireAny = false) {
  const keys = Object.keys(body);
  if (keys.some((key) => !allowed.includes(key))) {
    throw new HttpError(400, 'Unknown field');
  }
  for (const field of required) {
    if (!Object.hasOwn(body, field)) throw new HttpError(400, `Missing ${field}`);
  }
  if (requireAny && keys.length === 0) {
    throw new HttpError(400, 'At least one field is required');
  }
}

function characterCount(value) {
  return Array.from(value).length;
}

function requiredTrimmedString(value, field, max) {
  if (typeof value !== 'string') throw new HttpError(400, `Invalid ${field}`);
  const trimmed = value.trim();
  const length = characterCount(trimmed);
  if (length === 0 || length > max) {
    throw new HttpError(400, `Invalid ${field}`);
  }
  return trimmed;
}

function boundedString(value, field, max) {
  if (typeof value !== 'string' || characterCount(value) > max) {
    throw new HttpError(400, `Invalid ${field}`);
  }
  return value;
}

function enumValue(value, field, allowed) {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new HttpError(400, `Invalid ${field}`);
  }
  return value;
}

function validateProjectCreate(body) {
  validateFields(body, ['name', 'description'], ['name']);
  return {
    name: requiredTrimmedString(body.name, 'name', 120),
    description: Object.hasOwn(body, 'description')
      ? boundedString(body.description, 'description', 4000)
      : '',
  };
}

function validateProjectPatch(body) {
  validateFields(body, ['name', 'description'], [], true);
  const result = {};
  if (Object.hasOwn(body, 'name')) {
    result.name = requiredTrimmedString(body.name, 'name', 120);
  }
  if (Object.hasOwn(body, 'description')) {
    result.description = boundedString(body.description, 'description', 4000);
  }
  return result;
}

function validateTaskCreate(body) {
  validateFields(
    body,
    ['projectId', 'title', 'description', 'status', 'priority', 'assignee'],
    ['projectId', 'title']
  );
  if (!Number.isSafeInteger(body.projectId) || body.projectId <= 0) {
    throw new HttpError(400, 'Invalid projectId');
  }
  return {
    projectId: body.projectId,
    title: requiredTrimmedString(body.title, 'title', 200),
    description: Object.hasOwn(body, 'description')
      ? boundedString(body.description, 'description', 4000)
      : '',
    status: Object.hasOwn(body, 'status')
      ? enumValue(body.status, 'status', ['todo', 'doing', 'done'])
      : 'todo',
    priority: Object.hasOwn(body, 'priority')
      ? enumValue(body.priority, 'priority', ['low', 'medium', 'high'])
      : 'medium',
    assignee: Object.hasOwn(body, 'assignee')
      ? boundedString(body.assignee, 'assignee', 100)
      : '',
  };
}

function validateTaskPatch(body) {
  validateFields(
    body,
    ['title', 'description', 'status', 'priority', 'assignee'],
    [],
    true
  );
  const result = {};
  if (Object.hasOwn(body, 'title')) {
    result.title = requiredTrimmedString(body.title, 'title', 200);
  }
  if (Object.hasOwn(body, 'description')) {
    result.description = boundedString(body.description, 'description', 4000);
  }
  if (Object.hasOwn(body, 'status')) {
    result.status = enumValue(body.status, 'status', ['todo', 'doing', 'done']);
  }
  if (Object.hasOwn(body, 'priority')) {
    result.priority = enumValue(body.priority, 'priority', ['low', 'medium', 'high']);
  }
  if (Object.hasOwn(body, 'assignee')) {
    result.assignee = boundedString(body.assignee, 'assignee', 100);
  }
  return result;
}

function methodNotAllowed(allowed) {
  throw new HttpError(405, 'Method not allowed', { Allow: allowed.join(', ') });
}

async function serveStatic(pathname, response, headOnly = false) {
  const asset = STATIC_ASSETS.get(pathname);
  if (!asset) throw new HttpError(404, 'Not found');
  const [filename, contentType] = asset;
  try {
    const body = await readFile(path.join(PUBLIC_DIR, filename));
    response.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': body.length,
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(headOnly ? undefined : body);
  } catch {
    throw new HttpError(404, 'Not found');
  }
}

async function routeApi(request, response, store, pathname, searchParams) {
  if (pathname === '/api/health') {
    assertNoQuery(searchParams);
    if (request.method !== 'GET') methodNotAllowed(['GET']);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (pathname === '/api/projects') {
    assertNoQuery(searchParams);
    if (request.method === 'GET') {
      sendJson(response, 200, store.listProjects());
      return;
    }
    if (request.method === 'POST') {
      const body = validateProjectCreate(await readJsonObject(request));
      sendJson(response, 201, store.createProject(body));
      return;
    }
    methodNotAllowed(['GET', 'POST']);
  }

  const projectMatch = /^\/api\/projects\/([^/]+)$/.exec(pathname);
  if (projectMatch) {
    assertNoQuery(searchParams);
    const id = parseCanonicalId(projectMatch[1]);
    if (request.method === 'PATCH') {
      const body = validateProjectPatch(await readJsonObject(request));
      sendJson(response, 200, store.updateProject(id, body));
      return;
    }
    if (request.method === 'DELETE') {
      await readBody(request);
      store.deleteProject(id);
      sendEmpty(response, 204);
      return;
    }
    methodNotAllowed(['PATCH', 'DELETE']);
  }

  if (pathname === '/api/tasks') {
    if (request.method === 'GET') {
      const projectId = parseOptionalProjectId(searchParams);
      sendJson(response, 200, store.listTasks(projectId));
      return;
    }
    if (request.method === 'POST') {
      assertNoQuery(searchParams);
      const body = validateTaskCreate(await readJsonObject(request));
      sendJson(response, 201, store.createTask(body));
      return;
    }
    methodNotAllowed(['GET', 'POST']);
  }

  const taskMatch = /^\/api\/tasks\/([^/]+)$/.exec(pathname);
  if (taskMatch) {
    assertNoQuery(searchParams);
    const id = parseCanonicalId(taskMatch[1]);
    if (request.method === 'PATCH') {
      const body = validateTaskPatch(await readJsonObject(request));
      sendJson(response, 200, store.updateTask(id, body));
      return;
    }
    if (request.method === 'DELETE') {
      await readBody(request);
      store.deleteTask(id);
      sendEmpty(response, 204);
      return;
    }
    methodNotAllowed(['PATCH', 'DELETE']);
  }

  if (pathname === '/api/activity') {
    if (request.method !== 'GET') methodNotAllowed(['GET']);
    const projectId = parseOptionalProjectId(searchParams);
    sendJson(response, 200, store.listActivity(projectId));
    return;
  }

  throw new HttpError(404, 'Not found');
}

export function createServer({ dbPath } = {}) {
  if (typeof dbPath !== 'string' || dbPath.length === 0) {
    throw new TypeError('createServer requires a nonempty dbPath');
  }

  const store = createStore(dbPath);
  let databaseClosed = false;
  let server;

  server = http.createServer(async (request, response) => {
    try {
      enforceHost(request, server);
      enforceOrigin(request, server);

      let url;
      try {
        url = new URL(request.url, 'http://127.0.0.1');
      } catch {
        throw new HttpError(400, 'Invalid request target');
      }

      if (url.pathname.startsWith('/api/')) {
        await routeApi(request, response, store, url.pathname, url.searchParams);
        return;
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        methodNotAllowed(['GET', 'HEAD']);
      }
      assertNoQuery(url.searchParams);
      await serveStatic(url.pathname, response, request.method === 'HEAD');
    } catch (error) {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      if (error instanceof NotFoundError) {
        sendJson(response, 404, { error: error.message });
        return;
      }
      if (error instanceof HttpError) {
        sendJson(response, error.status, { error: error.message }, error.headers);
        return;
      }
      sendJson(response, 500, { error: 'Internal server error' });
    }
  });

  server.once('close', () => {
    if (!databaseClosed) {
      databaseClosed = true;
      store.close();
    }
  });

  return server;
}

const isMain = process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  const rawPort = process.env.PORT ?? '4381';
  if (!/^(0|[1-9][0-9]*)$/.test(rawPort)) {
    console.error('PORT must be an integer from 0 through 65535');
    process.exitCode = 1;
  } else {
    const port = Number(rawPort);
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
      console.error('PORT must be an integer from 0 through 65535');
      process.exitCode = 1;
    } else {
      const dbPath = process.env.DB_PATH ?? './issues.sqlite';
      const server = createServer({ dbPath });
      server.on('error', () => {
        console.error('Unable to start server');
        process.exitCode = 1;
      });
      server.listen(port, '127.0.0.1', () => {
        const address = server.address();
        console.log(`http://127.0.0.1:${address.port}`);
      });
    }
  }
}
