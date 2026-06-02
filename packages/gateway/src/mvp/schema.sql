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
