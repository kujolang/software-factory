import { DatabaseSync } from 'node:sqlite';

export class NotFoundError extends Error {}

const projectFromRow = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
});

const taskFromRow = (row) => ({
  id: row.id,
  projectId: row.project_id,
  title: row.title,
  description: row.description,
  status: row.status,
  priority: row.priority,
  assignee: row.assignee,
});

const activityFromRow = (row) => ({
  id: row.id,
  projectId: row.project_id,
  taskId: row.task_id,
  action: row.action,
  createdAt: row.created_at,
});

export function createStore(dbPath) {
  const db = new DatabaseSync(dbPath);
  let closed = false;

  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
      description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 4000)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
      description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 4000),
      status TEXT NOT NULL DEFAULT 'todo'
        CHECK (status IN ('todo', 'doing', 'done')),
      priority TEXT NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high')),
      assignee TEXT NOT NULL DEFAULT '' CHECK (length(assignee) <= 100),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY,
      project_id INTEGER NOT NULL,
      task_id INTEGER,
      action TEXT NOT NULL CHECK (action IN (
        'project.created',
        'project.updated',
        'task.created',
        'task.updated',
        'task.deleted'
      )),
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS tasks_project_id_idx
      ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS activity_project_order_idx
      ON activity(project_id, id DESC);
  `);

  const statements = {
    listProjects: db.prepare(
      'SELECT id, name, description FROM projects ORDER BY id ASC'
    ),
    getProject: db.prepare(
      'SELECT id, name, description FROM projects WHERE id = ?'
    ),
    insertProject: db.prepare(
      'INSERT INTO projects (name, description) VALUES (?, ?)'
    ),
    updateProject: db.prepare(
      'UPDATE projects SET name = ?, description = ? WHERE id = ?'
    ),
    deleteProject: db.prepare('DELETE FROM projects WHERE id = ?'),

    listTasks: db.prepare(`
      SELECT id, project_id, title, description, status, priority, assignee
      FROM tasks ORDER BY id ASC
    `),
    listTasksByProject: db.prepare(`
      SELECT id, project_id, title, description, status, priority, assignee
      FROM tasks WHERE project_id = ? ORDER BY id ASC
    `),
    getTask: db.prepare(`
      SELECT id, project_id, title, description, status, priority, assignee
      FROM tasks WHERE id = ?
    `),
    insertTask: db.prepare(`
      INSERT INTO tasks
        (project_id, title, description, status, priority, assignee)
      VALUES (?, ?, ?, ?, ?, ?)
    `),
    updateTask: db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, status = ?, priority = ?, assignee = ?
      WHERE id = ?
    `),
    deleteTask: db.prepare('DELETE FROM tasks WHERE id = ?'),

    listActivity: db.prepare(`
      SELECT id, project_id, task_id, action, created_at
      FROM activity ORDER BY id DESC
    `),
    listActivityByProject: db.prepare(`
      SELECT id, project_id, task_id, action, created_at
      FROM activity WHERE project_id = ? ORDER BY id DESC
    `),
    insertActivity: db.prepare(`
      INSERT INTO activity (project_id, task_id, action, created_at)
      VALUES (?, ?, ?, ?)
    `),
  };

  function transaction(operation) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Preserve the original failure.
      }
      throw error;
    }
  }

  function projectRow(id) {
    return statements.getProject.get(id);
  }

  function requireProject(id) {
    const row = projectRow(id);
    if (!row) throw new NotFoundError('Project not found');
    return row;
  }

  function taskRow(id) {
    return statements.getTask.get(id);
  }

  function recordActivity(projectId, taskId, action) {
    statements.insertActivity.run(
      projectId,
      taskId,
      action,
      new Date().toISOString()
    );
  }

  return {
    listProjects() {
      return statements.listProjects.all().map(projectFromRow);
    },

    getProject(id) {
      const row = projectRow(id);
      return row ? projectFromRow(row) : null;
    },

    createProject(input) {
      return transaction(() => {
        const result = statements.insertProject.run(input.name, input.description);
        const id = Number(result.lastInsertRowid);
        recordActivity(id, null, 'project.created');
        return projectFromRow(projectRow(id));
      });
    },

    updateProject(id, input) {
      return transaction(() => {
        const current = requireProject(id);
        statements.updateProject.run(
          input.name ?? current.name,
          input.description ?? current.description,
          id
        );
        recordActivity(id, null, 'project.updated');
        return projectFromRow(projectRow(id));
      });
    },

    deleteProject(id) {
      return transaction(() => {
        requireProject(id);
        statements.deleteProject.run(id);
      });
    },

    listTasks(projectId) {
      if (projectId !== undefined) requireProject(projectId);
      const rows = projectId === undefined
        ? statements.listTasks.all()
        : statements.listTasksByProject.all(projectId);
      return rows.map(taskFromRow);
    },

    getTask(id) {
      const row = taskRow(id);
      return row ? taskFromRow(row) : null;
    },

    createTask(input) {
      return transaction(() => {
        requireProject(input.projectId);
        const result = statements.insertTask.run(
          input.projectId,
          input.title,
          input.description,
          input.status,
          input.priority,
          input.assignee
        );
        const id = Number(result.lastInsertRowid);
        recordActivity(input.projectId, id, 'task.created');
        return taskFromRow(taskRow(id));
      });
    },

    updateTask(id, input) {
      return transaction(() => {
        const current = taskRow(id);
        if (!current) throw new NotFoundError('Task not found');
        statements.updateTask.run(
          input.title ?? current.title,
          input.description ?? current.description,
          input.status ?? current.status,
          input.priority ?? current.priority,
          input.assignee ?? current.assignee,
          id
        );
        recordActivity(current.project_id, id, 'task.updated');
        return taskFromRow(taskRow(id));
      });
    },

    deleteTask(id) {
      return transaction(() => {
        const current = taskRow(id);
        if (!current) throw new NotFoundError('Task not found');
        statements.deleteTask.run(id);
        recordActivity(current.project_id, id, 'task.deleted');
      });
    },

    listActivity(projectId) {
      if (projectId !== undefined) requireProject(projectId);
      const rows = projectId === undefined
        ? statements.listActivity.all()
        : statements.listActivityByProject.all(projectId);
      return rows.map(activityFromRow);
    },

    close() {
      if (!closed) {
        closed = true;
        db.close();
      }
    },
  };
}
