-- 部門マスタ
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ja TEXT NOT NULL,
  type TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 役職マスタ
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id),
  name TEXT NOT NULL,
  name_ja TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 役職権限
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,  -- script, storyboard, animation, audio, editing, assignment, budget
  level INT NOT NULL,   -- 1=view, 2=edit, 3=review, 4=approve, 5=admin
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, scope)
);

-- チームメンバー（Clerkユーザーとの紐付け）
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- プロジェクトアサイン
CREATE TABLE project_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES team_members(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  episode_id UUID REFERENCES episodes(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, team_member_id, role_id, episode_id)
);

-- 承認リクエスト
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES episodes(id),
  type TEXT NOT NULL,  -- script, storyboard, key_animation, audio_mix, final_cut
  submitter_id UUID NOT NULL REFERENCES team_members(id),
  resource_id UUID NOT NULL,
  resource_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  workflow_id TEXT,
  run_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 承認履歴
CREATE TABLE approval_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES team_members(id),
  action TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 各話制作進行
CREATE TABLE episode_productions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'planning',
  deadline TIMESTAMPTZ,
  progress_percent DECIMAL(5,2) DEFAULT 0,
  workflow_id TEXT,
  run_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, episode_id)
);

-- タスク
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES episodes(id),
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES team_members(id),
  role_id UUID REFERENCES roles(id),
  status TEXT NOT NULL DEFAULT 'created',
  deadline TIMESTAMPTZ,
  workflow_id TEXT,
  run_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_team_members_org ON team_members(org_id);
CREATE INDEX idx_project_team_assignments_project ON project_team_assignments(project_id);
CREATE INDEX idx_project_team_assignments_member ON project_team_assignments(team_member_id);
CREATE INDEX idx_approval_requests_project ON approval_requests(project_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_actions_approval ON approval_actions(approval_id);
CREATE INDEX idx_episode_productions_project ON episode_productions(project_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
