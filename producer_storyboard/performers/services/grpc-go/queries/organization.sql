-- name: ListDepartments :many
SELECT id, name, name_ja, type, display_order, created_at
FROM departments
ORDER BY display_order, name;

-- name: GetDepartment :one
SELECT id, name, name_ja, type, display_order, created_at
FROM departments
WHERE id = $1;

-- name: CreateDepartment :one
INSERT INTO departments (name, name_ja, type, display_order)
VALUES ($1, $2, $3, $4)
RETURNING id, name, name_ja, type, display_order, created_at;

-- name: ListRoles :many
SELECT id, department_id, name, name_ja, description, display_order, created_at
FROM roles
WHERE ($1::uuid IS NULL OR department_id = $1)
ORDER BY display_order, name;

-- name: GetRole :one
SELECT id, department_id, name, name_ja, description, display_order, created_at
FROM roles
WHERE id = $1;

-- name: CreateRole :one
INSERT INTO roles (department_id, name, name_ja, description, display_order)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, department_id, name, name_ja, description, display_order, created_at;

-- name: ListRolePermissions :many
SELECT id, role_id, scope, level, created_at
FROM role_permissions
WHERE role_id = $1;

-- name: GetRolePermissionsByRoleIds :many
SELECT id, role_id, scope, level, created_at
FROM role_permissions
WHERE role_id = ANY($1::uuid[]);

-- name: CreateRolePermission :one
INSERT INTO role_permissions (role_id, scope, level)
VALUES ($1, $2, $3)
RETURNING id, role_id, scope, level, created_at;

-- name: DeleteRolePermissions :exec
DELETE FROM role_permissions
WHERE role_id = $1;

-- name: ListTeamMembers :many
SELECT id, org_id, user_id, name, email, avatar_url, created_at
FROM team_members
WHERE org_id = $1
ORDER BY name;

-- name: GetTeamMember :one
SELECT id, org_id, user_id, name, email, avatar_url, created_at
FROM team_members
WHERE id = $1;

-- name: GetTeamMemberByUserId :one
SELECT id, org_id, user_id, name, email, avatar_url, created_at
FROM team_members
WHERE org_id = $1 AND user_id = $2;

-- name: UpsertTeamMember :one
INSERT INTO team_members (org_id, user_id, name, email, avatar_url)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (org_id, user_id) DO UPDATE
SET name = EXCLUDED.name, email = EXCLUDED.email, avatar_url = EXCLUDED.avatar_url
RETURNING id, org_id, user_id, name, email, avatar_url, created_at;

-- name: ListProjectTeamAssignments :many
SELECT 
  pta.id, pta.project_id, pta.team_member_id, pta.role_id, pta.episode_id, pta.assigned_at,
  tm.id as member_id, tm.org_id, tm.user_id, tm.name as member_name, tm.email, tm.avatar_url, tm.created_at as member_created_at,
  r.id as role_db_id, r.department_id, r.name as role_name, r.name_ja as role_name_ja, r.description as role_description, r.display_order as role_display_order, r.created_at as role_created_at
FROM project_team_assignments pta
JOIN team_members tm ON tm.id = pta.team_member_id
JOIN roles r ON r.id = pta.role_id
WHERE pta.project_id = $1
  AND ($2::uuid IS NULL OR pta.episode_id = $2)
ORDER BY r.display_order, tm.name;

-- name: CreateProjectTeamAssignment :one
INSERT INTO project_team_assignments (project_id, team_member_id, role_id, episode_id)
VALUES ($1, $2, $3, $4)
RETURNING id, project_id, team_member_id, role_id, episode_id, assigned_at;

-- name: DeleteProjectTeamAssignment :exec
DELETE FROM project_team_assignments
WHERE id = $1;

-- name: GetProjectTeamAssignment :one
SELECT id, project_id, team_member_id, role_id, episode_id, assigned_at
FROM project_team_assignments
WHERE id = $1;

-- name: GetUserRolesInProject :many
SELECT r.id, r.department_id, r.name, r.name_ja, r.description, r.display_order, r.created_at
FROM roles r
JOIN project_team_assignments pta ON pta.role_id = r.id
JOIN team_members tm ON tm.id = pta.team_member_id
WHERE pta.project_id = $1 AND tm.user_id = $2;

-- name: CheckUserPermission :one
SELECT MAX(rp.level) as max_level
FROM role_permissions rp
JOIN project_team_assignments pta ON pta.role_id = rp.role_id
JOIN team_members tm ON tm.id = pta.team_member_id
WHERE pta.project_id = $1 
  AND tm.user_id = $2 
  AND rp.scope = $3;

-- name: GetUserPermissionsInProject :many
SELECT rp.id, rp.role_id, rp.scope, rp.level, rp.created_at
FROM role_permissions rp
JOIN project_team_assignments pta ON pta.role_id = rp.role_id
JOIN team_members tm ON tm.id = pta.team_member_id
WHERE pta.project_id = $1 AND tm.user_id = $2;
