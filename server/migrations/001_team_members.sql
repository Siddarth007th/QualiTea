-- Team members with role (tester vs authority)
CREATE TABLE IF NOT EXISTS team_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  role       VARCHAR(20)  NOT NULL DEFAULT 'tester' CHECK (role IN ('tester','authority')),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
