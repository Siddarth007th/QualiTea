-- ============================================================
-- QA Tracking App — SQLite Schema
-- ============================================================

-- 1. Products
CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. QA Attributes (with optional prerequisite / dependency)
CREATE TABLE IF NOT EXISTS qa_attributes (
  id              TEXT PRIMARY KEY,
  product_id      TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  prerequisite_id TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  priority        TEXT NOT NULL DEFAULT 'medium',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (prerequisite_id) REFERENCES qa_attributes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_qa_attributes_product ON qa_attributes(product_id);

-- 3. QA Results
CREATE TABLE IF NOT EXISTS qa_results (
  id              TEXT PRIMARY KEY,
  attribute_id    TEXT NOT NULL,
  product_id      TEXT NOT NULL,
  status          TEXT NOT NULL,
  difficulty      TEXT,
  notes           TEXT,
  tested_by       TEXT,
  tested_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attribute_id) REFERENCES qa_attributes(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qa_results_product   ON qa_results(product_id);
CREATE INDEX IF NOT EXISTS idx_qa_results_attribute ON qa_results(attribute_id);

-- 4. Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'tester',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
