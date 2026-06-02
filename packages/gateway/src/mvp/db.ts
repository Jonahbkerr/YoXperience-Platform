import Database from 'better-sqlite3';

export type DB = Database.Database;

export function openDb(path: string): DB {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

// Inlined schema to keep migrations self-contained across ESM/CJS/test/build
// module resolution modes. Mirrors packages/gateway/src/mvp/schema.sql — keep
// the two in sync.
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);

CREATE TABLE IF NOT EXISTS lm_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  context TEXT NOT NULL,
  response TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  model TEXT
);

CREATE TABLE IF NOT EXISTS integrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service TEXT NOT NULL UNIQUE,
  tokens TEXT NOT NULL,
  connected_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS panels_rendered (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  panel_type TEXT NOT NULL,
  priority INTEGER NOT NULL,
  dismissed INTEGER DEFAULT 0,
  decision_id INTEGER,
  FOREIGN KEY(decision_id) REFERENCES lm_decisions(id)
);
`;

export function runMigrations(db: DB): void {
  db.exec(SCHEMA_SQL);
}
