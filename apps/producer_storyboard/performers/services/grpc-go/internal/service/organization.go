package service

import (
	"context"

	"connectrpc.com/connect"
	"github.com/google/uuid"

	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/auth"
	storyboardv1 "github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/storyboard/v1"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/services"
	"github.com/jackc/pgx/v5/pgtype"
)

// ListDepartments lists all departments
func (s *StoryboardService) ListDepartments(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListDepartmentsRequest],
) (*connect.Response[storyboardv1.ListDepartmentsResponse], error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, name, name_ja, type, display_order, created_at
		FROM departments
		ORDER BY display_order, name
	`)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var departments []*storyboardv1.Department
	for rows.Next() {
		var d storyboardv1.Department
		var id pgtype.UUID
		var createdAt pgtype.Timestamptz
		var deptType string
		var displayOrder int32

		err := rows.Scan(&id, &d.Name, &d.NameJa, &deptType, &displayOrder, &createdAt)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}

		d.Id = pgUUIDToString(id)
		d.DisplayOrder = displayOrder
		d.Type = parseDepartmentType(deptType)
		if createdAt.Valid {
			d.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
		}

		departments = append(departments, &d)
	}

	return connect.NewResponse(&storyboardv1.ListDepartmentsResponse{
		Departments: departments,
	}), nil
}

// ListRoles lists roles, optionally filtered by department
func (s *StoryboardService) ListRoles(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListRolesRequest],
) (*connect.Response[storyboardv1.ListRolesResponse], error) {
	var rows interface{ Close() }
	var err error

	query := `
		SELECT r.id, r.department_id, r.name, r.name_ja, r.description, r.display_order, r.created_at
		FROM roles r
		WHERE ($1::uuid IS NULL OR r.department_id = $1)
		ORDER BY r.display_order, r.name
	`

	var deptID interface{}
	if req.Msg.DepartmentId != nil {
		parsedID, parseErr := uuid.Parse(*req.Msg.DepartmentId)
		if parseErr != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, parseErr)
		}
		deptID = parsedID
	}

	dbRows, err := s.db.Query(ctx, query, deptID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer dbRows.Close()
	rows = dbRows

	var roles []*storyboardv1.Role
	for dbRows.Next() {
		var r storyboardv1.Role
		var id, departmentID pgtype.UUID
		var description pgtype.Text
		var createdAt pgtype.Timestamptz
		var displayOrder int32

		err := dbRows.Scan(&id, &departmentID, &r.Name, &r.NameJa, &description, &displayOrder, &createdAt)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}

		r.Id = pgUUIDToString(id)
		r.DepartmentId = pgUUIDToString(departmentID)
		r.DisplayOrder = displayOrder
		if description.Valid {
			r.Description = description.String
		}
		if createdAt.Valid {
			r.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
		}

		// Load permissions for this role
		permissions, err := s.loadRolePermissions(ctx, id)
		if err == nil {
			r.Permissions = permissions
		}

		roles = append(roles, &r)
	}

	_ = rows // Suppress unused variable warning

	return connect.NewResponse(&storyboardv1.ListRolesResponse{
		Roles: roles,
	}), nil
}

func (s *StoryboardService) loadRolePermissions(ctx context.Context, roleID pgtype.UUID) ([]*storyboardv1.RolePermission, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, role_id, scope, level, created_at
		FROM role_permissions
		WHERE role_id = $1
	`, roleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var permissions []*storyboardv1.RolePermission
	for rows.Next() {
		var p storyboardv1.RolePermission
		var id, roleIdPg pgtype.UUID
		var scope string
		var level int32
		var createdAt pgtype.Timestamptz

		err := rows.Scan(&id, &roleIdPg, &scope, &level, &createdAt)
		if err != nil {
			return nil, err
		}

		p.Id = pgUUIDToString(id)
		p.RoleId = pgUUIDToString(roleIdPg)
		p.Scope = parsePermissionScope(scope)
		p.Level = parsePermissionLevel(level)

		permissions = append(permissions, &p)
	}

	return permissions, nil
}

// GetProjectOrganization returns the complete organization structure for a project
func (s *StoryboardService) GetProjectOrganization(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetProjectOrganizationRequest],
) (*connect.Response[storyboardv1.ProjectOrganization], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	// Get all departments
	deptRows, err := s.db.Query(ctx, `
		SELECT id, name, name_ja, type, display_order
		FROM departments
		ORDER BY display_order
	`)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer deptRows.Close()

	var sections []*storyboardv1.DepartmentSection
	for deptRows.Next() {
		var dept storyboardv1.Department
		var id pgtype.UUID
		var deptType string
		var displayOrder int32

		err := deptRows.Scan(&id, &dept.Name, &dept.NameJa, &deptType, &displayOrder)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}

		dept.Id = pgUUIDToString(id)
		dept.Type = parseDepartmentType(deptType)
		dept.DisplayOrder = displayOrder

		// Get roles and assignments for this department
		roleAssignments, err := s.getRoleAssignmentsForDepartment(ctx, id, projectID)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}

		sections = append(sections, &storyboardv1.DepartmentSection{
			Department:  &dept,
			Assignments: roleAssignments,
		})
	}

	return connect.NewResponse(&storyboardv1.ProjectOrganization{
		ProjectId:   req.Msg.ProjectId,
		Departments: sections,
	}), nil
}

func (s *StoryboardService) getRoleAssignmentsForDepartment(ctx context.Context, deptID pgtype.UUID, projectID uuid.UUID) ([]*storyboardv1.RoleAssignment, error) {
	// Get roles for this department
	roleRows, err := s.db.Query(ctx, `
		SELECT id, name, name_ja, description, display_order
		FROM roles
		WHERE department_id = $1
		ORDER BY display_order
	`, deptID)
	if err != nil {
		return nil, err
	}
	defer roleRows.Close()

	var assignments []*storyboardv1.RoleAssignment
	for roleRows.Next() {
		var role storyboardv1.Role
		var roleID pgtype.UUID
		var description pgtype.Text
		var displayOrder int32

		err := roleRows.Scan(&roleID, &role.Name, &role.NameJa, &description, &displayOrder)
		if err != nil {
			return nil, err
		}

		role.Id = pgUUIDToString(roleID)
		role.DepartmentId = pgUUIDToString(deptID)
		role.DisplayOrder = displayOrder
		if description.Valid {
			role.Description = description.String
		}

		// Get members assigned to this role in this project
		members, err := s.getMembersForRole(ctx, roleID, projectID)
		if err != nil {
			return nil, err
		}

		assignments = append(assignments, &storyboardv1.RoleAssignment{
			Role:    &role,
			Members: members,
		})
	}

	return assignments, nil
}

func (s *StoryboardService) getMembersForRole(ctx context.Context, roleID pgtype.UUID, projectID uuid.UUID) ([]*storyboardv1.TeamMember, error) {
	rows, err := s.db.Query(ctx, `
		SELECT tm.id, tm.org_id, tm.user_id, tm.name, tm.email, tm.avatar_url, tm.created_at
		FROM team_members tm
		JOIN project_team_assignments pta ON pta.team_member_id = tm.id
		WHERE pta.project_id = $1 AND pta.role_id = $2
	`, projectID, roleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []*storyboardv1.TeamMember
	for rows.Next() {
		var m storyboardv1.TeamMember
		var id pgtype.UUID
		var email, avatarURL pgtype.Text
		var createdAt pgtype.Timestamptz

		err := rows.Scan(&id, &m.OrgId, &m.UserId, &m.Name, &email, &avatarURL, &createdAt)
		if err != nil {
			return nil, err
		}

		m.Id = pgUUIDToString(id)
		if email.Valid {
			m.Email = email.String
		}
		if avatarURL.Valid {
			m.AvatarUrl = avatarURL.String
		}
		if createdAt.Valid {
			m.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
		}

		members = append(members, &m)
	}

	return members, nil
}

// ListTeamMembers lists all team members for an organization
func (s *StoryboardService) ListTeamMembers(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListTeamMembersRequest],
) (*connect.Response[storyboardv1.ListTeamMembersResponse], error) {
	orgID := req.Msg.OrgId
	if orgID == "" {
		orgID = auth.GetOrgIDFromContext(ctx)
	}

	rows, err := s.db.Query(ctx, `
		SELECT id, org_id, user_id, name, email, avatar_url, created_at
		FROM team_members
		WHERE org_id = $1
		ORDER BY name
	`, orgID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var members []*storyboardv1.TeamMember
	for rows.Next() {
		var m storyboardv1.TeamMember
		var id pgtype.UUID
		var email, avatarURL pgtype.Text
		var createdAt pgtype.Timestamptz

		err := rows.Scan(&id, &m.OrgId, &m.UserId, &m.Name, &email, &avatarURL, &createdAt)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}

		m.Id = pgUUIDToString(id)
		if email.Valid {
			m.Email = email.String
		}
		if avatarURL.Valid {
			m.AvatarUrl = avatarURL.String
		}
		if createdAt.Valid {
			m.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
		}

		members = append(members, &m)
	}

	return connect.NewResponse(&storyboardv1.ListTeamMembersResponse{
		Members: members,
	}), nil
}

// SyncClerkMembers syncs team members from Clerk organization
func (s *StoryboardService) SyncClerkMembers(
	ctx context.Context,
	req *connect.Request[storyboardv1.SyncClerkMembersRequest],
) (*connect.Response[storyboardv1.SyncClerkMembersResponse], error) {
	orgID := req.Msg.OrgId
	if orgID == "" {
		orgID = auth.GetOrgIDFromContext(ctx)
	}

	// Try to create Clerk service
	clerkService, err := services.NewClerkService()
	if err != nil {
		// Clerk not configured, return empty
		return connect.NewResponse(&storyboardv1.SyncClerkMembersResponse{
			Members:     []*storyboardv1.TeamMember{},
			SyncedCount: 0,
		}), nil
	}

	// Fetch members from Clerk
	clerkMembers, err := clerkService.GetOrganizationMembersInfo(orgID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var syncedMembers []*storyboardv1.TeamMember
	syncedCount := int32(0)

	for _, cm := range clerkMembers {
		// Upsert team member
		var member storyboardv1.TeamMember
		var id pgtype.UUID
		var email, avatarURL pgtype.Text
		var createdAt pgtype.Timestamptz

		err := s.db.QueryRow(ctx, `
			INSERT INTO team_members (org_id, user_id, name, email, avatar_url)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (org_id, user_id) DO UPDATE
			SET name = EXCLUDED.name, email = EXCLUDED.email, avatar_url = EXCLUDED.avatar_url
			RETURNING id, org_id, user_id, name, email, avatar_url, created_at
		`, orgID, cm.UserID, cm.Name, cm.Email, cm.AvatarURL).Scan(
			&id, &member.OrgId, &member.UserId, &member.Name, &email, &avatarURL, &createdAt,
		)
		if err != nil {
			continue
		}

		member.Id = pgUUIDToString(id)
		if email.Valid {
			member.Email = email.String
		}
		if avatarURL.Valid {
			member.AvatarUrl = avatarURL.String
		}
		if createdAt.Valid {
			member.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
		}

		syncedMembers = append(syncedMembers, &member)
		syncedCount++
	}

	return connect.NewResponse(&storyboardv1.SyncClerkMembersResponse{
		Members:     syncedMembers,
		SyncedCount: syncedCount,
	}), nil
}

// AssignTeamMember assigns a team member to a role in a project
func (s *StoryboardService) AssignTeamMember(
	ctx context.Context,
	req *connect.Request[storyboardv1.AssignTeamMemberRequest],
) (*connect.Response[storyboardv1.ProjectTeamAssignment], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	memberID, err := uuid.Parse(req.Msg.TeamMemberId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	roleID, err := uuid.Parse(req.Msg.RoleId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var episodeID interface{}
	if req.Msg.EpisodeId != nil {
		parsedEpisodeID, parseErr := uuid.Parse(*req.Msg.EpisodeId)
		if parseErr != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, parseErr)
		}
		episodeID = parsedEpisodeID
	}

	var assignment storyboardv1.ProjectTeamAssignment
	var id pgtype.UUID
	var assignedAt pgtype.Timestamptz
	var episodeIDPg pgtype.UUID

	err = s.db.QueryRow(ctx, `
		INSERT INTO project_team_assignments (project_id, team_member_id, role_id, episode_id)
		VALUES ($1, $2, $3, $4)
		RETURNING id, project_id, team_member_id, role_id, episode_id, assigned_at
	`, projectID, memberID, roleID, episodeID).Scan(&id, &assignment.ProjectId, &assignment.TeamMemberId, &assignment.RoleId, &episodeIDPg, &assignedAt)

	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	assignment.Id = pgUUIDToString(id)
	if episodeIDPg.Valid {
		episodeIDStr := pgUUIDToString(episodeIDPg)
		assignment.EpisodeId = &episodeIDStr
	}
	if assignedAt.Valid {
		assignment.AssignedAt = assignedAt.Time.Format("2006-01-02T15:04:05Z")
	}

	return connect.NewResponse(&assignment), nil
}

// UnassignTeamMember removes a team member assignment
func (s *StoryboardService) UnassignTeamMember(
	ctx context.Context,
	req *connect.Request[storyboardv1.UnassignTeamMemberRequest],
) (*connect.Response[storyboardv1.UnassignTeamMemberResponse], error) {
	assignmentID, err := uuid.Parse(req.Msg.AssignmentId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	_, err = s.db.Exec(ctx, `DELETE FROM project_team_assignments WHERE id = $1`, assignmentID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.UnassignTeamMemberResponse{
		Success: true,
	}), nil
}

// ListProjectAssignments lists all team assignments for a project
func (s *StoryboardService) ListProjectAssignments(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListProjectAssignmentsRequest],
) (*connect.Response[storyboardv1.ListProjectAssignmentsResponse], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var episodeID interface{}
	if req.Msg.EpisodeId != nil {
		parsedEpisodeID, parseErr := uuid.Parse(*req.Msg.EpisodeId)
		if parseErr != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, parseErr)
		}
		episodeID = parsedEpisodeID
	}

	rows, err := s.db.Query(ctx, `
		SELECT 
			pta.id, pta.project_id, pta.team_member_id, pta.role_id, pta.episode_id, pta.assigned_at,
			tm.id, tm.org_id, tm.user_id, tm.name, tm.email, tm.avatar_url, tm.created_at,
			r.id, r.department_id, r.name, r.name_ja, r.description, r.display_order, r.created_at
		FROM project_team_assignments pta
		JOIN team_members tm ON tm.id = pta.team_member_id
		JOIN roles r ON r.id = pta.role_id
		WHERE pta.project_id = $1 AND ($2::uuid IS NULL OR pta.episode_id = $2)
		ORDER BY r.display_order, tm.name
	`, projectID, episodeID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var assignments []*storyboardv1.ProjectTeamAssignment
	for rows.Next() {
		var a storyboardv1.ProjectTeamAssignment
		var m storyboardv1.TeamMember
		var r storyboardv1.Role

		var aID, tmID, roleID, deptID pgtype.UUID
		var episodeIDPg pgtype.UUID
		var assignedAt, tmCreatedAt, roleCreatedAt pgtype.Timestamptz
		var email, avatarURL, roleDesc pgtype.Text
		var displayOrder int32

		err := rows.Scan(
			&aID, &a.ProjectId, &a.TeamMemberId, &a.RoleId, &episodeIDPg, &assignedAt,
			&tmID, &m.OrgId, &m.UserId, &m.Name, &email, &avatarURL, &tmCreatedAt,
			&roleID, &deptID, &r.Name, &r.NameJa, &roleDesc, &displayOrder, &roleCreatedAt,
		)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}

		a.Id = pgUUIDToString(aID)
		if episodeIDPg.Valid {
			episodeIDStr := pgUUIDToString(episodeIDPg)
			a.EpisodeId = &episodeIDStr
		}
		if assignedAt.Valid {
			a.AssignedAt = assignedAt.Time.Format("2006-01-02T15:04:05Z")
		}

		m.Id = pgUUIDToString(tmID)
		if email.Valid {
			m.Email = email.String
		}
		if avatarURL.Valid {
			m.AvatarUrl = avatarURL.String
		}
		if tmCreatedAt.Valid {
			m.CreatedAt = tmCreatedAt.Time.Format("2006-01-02T15:04:05Z")
		}

		r.Id = pgUUIDToString(roleID)
		r.DepartmentId = pgUUIDToString(deptID)
		r.DisplayOrder = displayOrder
		if roleDesc.Valid {
			r.Description = roleDesc.String
		}
		if roleCreatedAt.Valid {
			r.CreatedAt = roleCreatedAt.Time.Format("2006-01-02T15:04:05Z")
		}

		a.Member = &m
		a.Role = &r

		assignments = append(assignments, &a)
	}

	return connect.NewResponse(&storyboardv1.ListProjectAssignmentsResponse{
		Assignments: assignments,
	}), nil
}

// CheckPermission checks if a user has the required permission level
func (s *StoryboardService) CheckPermission(
	ctx context.Context,
	req *connect.Request[storyboardv1.CheckPermissionRequest],
) (*connect.Response[storyboardv1.CheckPermissionResponse], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	scope := permissionScopeToString(req.Msg.Scope)
	requiredLevel := int32(req.Msg.RequiredLevel)

	var maxLevel int32
	err = s.db.QueryRow(ctx, `
		SELECT COALESCE(MAX(rp.level), 0) as max_level
		FROM role_permissions rp
		JOIN project_team_assignments pta ON pta.role_id = rp.role_id
		JOIN team_members tm ON tm.id = pta.team_member_id
		WHERE pta.project_id = $1 AND tm.user_id = $2 AND rp.scope = $3
	`, projectID, req.Msg.UserId, scope).Scan(&maxLevel)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.CheckPermissionResponse{
		Allowed:   maxLevel >= requiredLevel,
		UserLevel: parsePermissionLevel(maxLevel),
	}), nil
}

// GetUserPermissions returns all permissions for a user in a project
func (s *StoryboardService) GetUserPermissions(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetUserPermissionsRequest],
) (*connect.Response[storyboardv1.GetUserPermissionsResponse], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	rows, err := s.db.Query(ctx, `
		SELECT rp.id, rp.role_id, rp.scope, rp.level
		FROM role_permissions rp
		JOIN project_team_assignments pta ON pta.role_id = rp.role_id
		JOIN team_members tm ON tm.id = pta.team_member_id
		WHERE pta.project_id = $1 AND tm.user_id = $2
	`, projectID, req.Msg.UserId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var permissions []*storyboardv1.RolePermission
	for rows.Next() {
		var p storyboardv1.RolePermission
		var id, roleID pgtype.UUID
		var scope string
		var level int32

		err := rows.Scan(&id, &roleID, &scope, &level)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}

		p.Id = pgUUIDToString(id)
		p.RoleId = pgUUIDToString(roleID)
		p.Scope = parsePermissionScope(scope)
		p.Level = parsePermissionLevel(level)

		permissions = append(permissions, &p)
	}

	return connect.NewResponse(&storyboardv1.GetUserPermissionsResponse{
		Permissions: permissions,
	}), nil
}

// Helper functions

func parseDepartmentType(s string) storyboardv1.DepartmentType {
	switch s {
	case "production_leadership":
		return storyboardv1.DepartmentType_DEPARTMENT_TYPE_PRODUCTION_LEADERSHIP
	case "creative_leadership":
		return storyboardv1.DepartmentType_DEPARTMENT_TYPE_CREATIVE_LEADERSHIP
	case "script":
		return storyboardv1.DepartmentType_DEPARTMENT_TYPE_SCRIPT
	case "visual":
		return storyboardv1.DepartmentType_DEPARTMENT_TYPE_VISUAL
	case "direction":
		return storyboardv1.DepartmentType_DEPARTMENT_TYPE_DIRECTION
	case "audio":
		return storyboardv1.DepartmentType_DEPARTMENT_TYPE_AUDIO
	case "post_production":
		return storyboardv1.DepartmentType_DEPARTMENT_TYPE_POST_PRODUCTION
	default:
		return storyboardv1.DepartmentType_DEPARTMENT_TYPE_UNSPECIFIED
	}
}

func parsePermissionScope(s string) storyboardv1.PermissionScope {
	switch s {
	case "script":
		return storyboardv1.PermissionScope_PERMISSION_SCOPE_SCRIPT
	case "storyboard":
		return storyboardv1.PermissionScope_PERMISSION_SCOPE_STORYBOARD
	case "animation":
		return storyboardv1.PermissionScope_PERMISSION_SCOPE_ANIMATION
	case "audio":
		return storyboardv1.PermissionScope_PERMISSION_SCOPE_AUDIO
	case "editing":
		return storyboardv1.PermissionScope_PERMISSION_SCOPE_EDITING
	case "assignment":
		return storyboardv1.PermissionScope_PERMISSION_SCOPE_ASSIGNMENT
	case "budget":
		return storyboardv1.PermissionScope_PERMISSION_SCOPE_BUDGET
	default:
		return storyboardv1.PermissionScope_PERMISSION_SCOPE_UNSPECIFIED
	}
}

func permissionScopeToString(scope storyboardv1.PermissionScope) string {
	switch scope {
	case storyboardv1.PermissionScope_PERMISSION_SCOPE_SCRIPT:
		return "script"
	case storyboardv1.PermissionScope_PERMISSION_SCOPE_STORYBOARD:
		return "storyboard"
	case storyboardv1.PermissionScope_PERMISSION_SCOPE_ANIMATION:
		return "animation"
	case storyboardv1.PermissionScope_PERMISSION_SCOPE_AUDIO:
		return "audio"
	case storyboardv1.PermissionScope_PERMISSION_SCOPE_EDITING:
		return "editing"
	case storyboardv1.PermissionScope_PERMISSION_SCOPE_ASSIGNMENT:
		return "assignment"
	case storyboardv1.PermissionScope_PERMISSION_SCOPE_BUDGET:
		return "budget"
	default:
		return ""
	}
}

func parsePermissionLevel(level int32) storyboardv1.PermissionLevel {
	switch level {
	case 1:
		return storyboardv1.PermissionLevel_PERMISSION_LEVEL_VIEW
	case 2:
		return storyboardv1.PermissionLevel_PERMISSION_LEVEL_EDIT
	case 3:
		return storyboardv1.PermissionLevel_PERMISSION_LEVEL_REVIEW
	case 4:
		return storyboardv1.PermissionLevel_PERMISSION_LEVEL_APPROVE
	case 5:
		return storyboardv1.PermissionLevel_PERMISSION_LEVEL_ADMIN
	default:
		return storyboardv1.PermissionLevel_PERMISSION_LEVEL_UNSPECIFIED
	}
}
