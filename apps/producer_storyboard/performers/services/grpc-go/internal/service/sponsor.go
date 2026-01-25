package service

import (
	"context"
	"encoding/json"
	"fmt"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/auth"
	storyboardv1 "github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/storyboard/v1"
)

// ListSponsors lists sponsors with optional filters
func (s *StoryboardService) ListSponsors(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListSponsorsRequest],
) (*connect.Response[storyboardv1.ListSponsorsResponse], error) {
	orgID := req.Msg.OrgId
	if orgID == "" {
		orgID = auth.GetOrgIDFromContext(ctx)
	}

	var projectID interface{}
	if req.Msg.ProjectId != nil {
		parsedID, err := uuid.Parse(*req.Msg.ProjectId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		projectID = parsedID
	}

	var status interface{}
	if req.Msg.Status != nil && *req.Msg.Status != storyboardv1.SponsorStatus_SPONSOR_STATUS_UNSPECIFIED {
		status = sponsorStatusToString(*req.Msg.Status)
	}

	rows, err := s.db.Query(ctx, `
		SELECT 
			id, org_id, project_id, name, industry, contact_email, contact_phone,
			website, address, budget_min, budget_max, preferences_json, status, notes,
			created_at, updated_at
		FROM sponsors
		WHERE org_id = $1
			AND ($2::uuid IS NULL OR project_id = $2)
			AND ($3::varchar IS NULL OR status = $3)
			AND ($4::varchar IS NULL OR industry = $4)
			AND ($5::varchar IS NULL OR name ILIKE '%' || $5 || '%' OR contact_email ILIKE '%' || $5 || '%')
		ORDER BY created_at DESC
	`, orgID, projectID, status, req.Msg.Industry, req.Msg.SearchQuery)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var sponsors []*storyboardv1.Sponsor
	for rows.Next() {
		sponsor, err := scanSponsor(rows)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		sponsors = append(sponsors, sponsor)
	}

	return connect.NewResponse(&storyboardv1.ListSponsorsResponse{
		Sponsors: sponsors,
	}), nil
}

// GetSponsor gets a sponsor with contacts
func (s *StoryboardService) GetSponsor(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetSponsorRequest],
) (*connect.Response[storyboardv1.GetSponsorResponse], error) {
	sponsorID, err := uuid.Parse(req.Msg.SponsorId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var sponsor storyboardv1.Sponsor
	var projectID pgtype.UUID
	var industry, contactEmail, contactPhone, website, address, notes pgtype.Text
	var budgetMin, budgetMax pgtype.Numeric
	var preferencesJSON pgtype.JSONB
	var status string
	var createdAt, updatedAt pgtype.Timestamptz

	err = s.db.QueryRow(ctx, `
		SELECT 
			id, org_id, project_id, name, industry, contact_email, contact_phone,
			website, address, budget_min, budget_max, preferences_json, status, notes,
			created_at, updated_at
		FROM sponsors
		WHERE id = $1
	`, sponsorID).Scan(
		&sponsorID, &sponsor.OrgId, &projectID, &sponsor.Name,
		&industry, &contactEmail, &contactPhone, &website, &address,
		&budgetMin, &budgetMax, &preferencesJSON, &status, &notes,
		&createdAt, &updatedAt,
	)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	sponsor.Id = sponsorID.String()
	if projectID.Valid {
		projectIDStr := pgUUIDToString(projectID)
		sponsor.ProjectId = &projectIDStr
	}
	if industry.Valid {
		sponsor.Industry = &industry.String
	}
	if contactEmail.Valid {
		sponsor.ContactEmail = &contactEmail.String
	}
	if contactPhone.Valid {
		sponsor.ContactPhone = &contactPhone.String
	}
	if website.Valid {
		sponsor.Website = &website.String
	}
	if address.Valid {
		sponsor.Address = &address.String
	}
	if budgetMin.Valid {
		budgetMinFloat, _ := budgetMin.Float64Value()
		if budgetMinFloat.Valid {
			budgetMinStr := fmt.Sprintf("%.2f", budgetMinFloat.Float64)
			sponsor.BudgetMin = &budgetMinStr
		}
	}
	if budgetMax.Valid {
		budgetMaxFloat, _ := budgetMax.Float64Value()
		if budgetMaxFloat.Valid {
			budgetMaxStr := fmt.Sprintf("%.2f", budgetMaxFloat.Float64)
			sponsor.BudgetMax = &budgetMaxStr
		}
	}
	if preferencesJSON.Valid {
		var prefs map[string]interface{}
		if err := json.Unmarshal(preferencesJSON.Bytes, &prefs); err == nil {
			sponsor.Preferences = make(map[string]string)
			for k, v := range prefs {
				if str, ok := v.(string); ok {
					sponsor.Preferences[k] = str
				} else {
					sponsor.Preferences[k] = fmt.Sprintf("%v", v)
				}
			}
		}
	}
	sponsor.Status = stringToSponsorStatus(status)
	if notes.Valid {
		sponsor.Notes = &notes.String
	}
	if createdAt.Valid {
		sponsor.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
	}
	if updatedAt.Valid {
		sponsor.UpdatedAt = updatedAt.Time.Format("2006-01-02T15:04:05Z")
	}

	// Get contacts
	contactRows, err := s.db.Query(ctx, `
		SELECT id, sponsor_id, contact_name, role, email, phone, is_primary, created_at, updated_at
		FROM sponsor_contacts
		WHERE sponsor_id = $1
		ORDER BY is_primary DESC, contact_name
	`, sponsorID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer contactRows.Close()

	var contacts []*storyboardv1.SponsorContact
	for contactRows.Next() {
		contact, err := scanSponsorContact(contactRows)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		contacts = append(contacts, contact)
	}

	return connect.NewResponse(&storyboardv1.GetSponsorResponse{
		Sponsor:  &sponsor,
		Contacts: contacts,
	}), nil
}

// CreateSponsor creates a new sponsor
func (s *StoryboardService) CreateSponsor(
	ctx context.Context,
	req *connect.Request[storyboardv1.CreateSponsorRequest],
) (*connect.Response[storyboardv1.CreateSponsorResponse], error) {
	orgID := req.Msg.OrgId
	if orgID == "" {
		orgID = auth.GetOrgIDFromContext(ctx)
	}

	var projectID interface{}
	if req.Msg.ProjectId != nil {
		parsedID, err := uuid.Parse(*req.Msg.ProjectId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		projectID = parsedID
	}

	preferencesJSON, err := json.Marshal(req.Msg.Preferences)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var budgetMin, budgetMax interface{}
	if req.Msg.BudgetMin != nil {
		budgetMin = *req.Msg.BudgetMin
	}
	if req.Msg.BudgetMax != nil {
		budgetMax = *req.Msg.BudgetMax
	}

	row := s.db.QueryRow(ctx, `
		INSERT INTO sponsors (
			org_id, project_id, name, industry, contact_email, contact_phone,
			website, address, budget_min, budget_max, preferences_json, notes, status
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'prospect')
		RETURNING 
			id, org_id, project_id, name, industry, contact_email, contact_phone,
			website, address, budget_min, budget_max, preferences_json, status, notes,
			created_at, updated_at
	`, orgID, projectID, req.Msg.Name, req.Msg.Industry,
		req.Msg.ContactEmail, req.Msg.ContactPhone, req.Msg.Website, req.Msg.Address,
		budgetMin, budgetMax, preferencesJSON, req.Msg.Notes)

	sponsor, err := scanSponsor(row)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.CreateSponsorResponse{
		Sponsor: sponsor,
	}), nil
}

// UpdateSponsor updates a sponsor
func (s *StoryboardService) UpdateSponsor(
	ctx context.Context,
	req *connect.Request[storyboardv1.UpdateSponsorRequest],
) (*connect.Response[storyboardv1.UpdateSponsorResponse], error) {
	sponsorID, err := uuid.Parse(req.Msg.SponsorId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	// Build update query dynamically
	updates := []string{}
	args := []interface{}{sponsorID}
	argIndex := 2

	if req.Msg.Name != nil {
		updates = append(updates, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *req.Msg.Name)
		argIndex++
	}
	if req.Msg.Industry != nil {
		updates = append(updates, fmt.Sprintf("industry = $%d", argIndex))
		args = append(args, *req.Msg.Industry)
		argIndex++
	}
	if req.Msg.ContactEmail != nil {
		updates = append(updates, fmt.Sprintf("contact_email = $%d", argIndex))
		args = append(args, *req.Msg.ContactEmail)
		argIndex++
	}
	if req.Msg.ContactPhone != nil {
		updates = append(updates, fmt.Sprintf("contact_phone = $%d", argIndex))
		args = append(args, *req.Msg.ContactPhone)
		argIndex++
	}
	if req.Msg.Website != nil {
		updates = append(updates, fmt.Sprintf("website = $%d", argIndex))
		args = append(args, *req.Msg.Website)
		argIndex++
	}
	if req.Msg.Address != nil {
		updates = append(updates, fmt.Sprintf("address = $%d", argIndex))
		args = append(args, *req.Msg.Address)
		argIndex++
	}
	if req.Msg.BudgetMin != nil {
		updates = append(updates, fmt.Sprintf("budget_min = $%d", argIndex))
		args = append(args, *req.Msg.BudgetMin)
		argIndex++
	}
	if req.Msg.BudgetMax != nil {
		updates = append(updates, fmt.Sprintf("budget_max = $%d", argIndex))
		args = append(args, *req.Msg.BudgetMax)
		argIndex++
	}
	if req.Msg.Preferences != nil {
		preferencesJSON, err := json.Marshal(req.Msg.Preferences)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		updates = append(updates, fmt.Sprintf("preferences_json = $%d", argIndex))
		args = append(args, preferencesJSON)
		argIndex++
	}
	if req.Msg.Status != nil {
		updates = append(updates, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, sponsorStatusToString(*req.Msg.Status))
		argIndex++
	}
	if req.Msg.Notes != nil {
		updates = append(updates, fmt.Sprintf("notes = $%d", argIndex))
		args = append(args, *req.Msg.Notes)
		argIndex++
	}

	if len(updates) == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("no fields to update"))
	}

	updates = append(updates, "updated_at = NOW()")
	updateClause := fmt.Sprintf("%s", updates[0])
	for i := 1; i < len(updates); i++ {
		updateClause = fmt.Sprintf("%s, %s", updateClause, updates[i])
	}

	query := fmt.Sprintf(`
		UPDATE sponsors
		SET %s
		WHERE id = $1
		RETURNING 
			id, org_id, project_id, name, industry, contact_email, contact_phone,
			website, address, budget_min, budget_max, preferences_json, status, notes,
			created_at, updated_at
	`, updateClause)

	row := s.db.QueryRow(ctx, query, args...)
	sponsor, err := scanSponsor(row)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.UpdateSponsorResponse{
		Sponsor: sponsor,
	}), nil
}

// DeleteSponsor deletes a sponsor
func (s *StoryboardService) DeleteSponsor(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteSponsorRequest],
) (*connect.Response[storyboardv1.DeleteSponsorResponse], error) {
	sponsorID, err := uuid.Parse(req.Msg.SponsorId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	_, err = s.db.Exec(ctx, `DELETE FROM sponsors WHERE id = $1`, sponsorID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteSponsorResponse{
		Success: true,
	}), nil
}

// SearchSponsors searches sponsors with various criteria
func (s *StoryboardService) SearchSponsors(
	ctx context.Context,
	req *connect.Request[storyboardv1.SearchSponsorsRequest],
) (*connect.Response[storyboardv1.SearchSponsorsResponse], error) {
	orgID := req.Msg.OrgId
	if orgID == "" {
		orgID = auth.GetOrgIDFromContext(ctx)
	}

	var status interface{}
	if req.Msg.Status != nil && *req.Msg.Status != storyboardv1.SponsorStatus_SPONSOR_STATUS_UNSPECIFIED {
		status = sponsorStatusToString(*req.Msg.Status)
	}

	var budgetMin, budgetMax interface{}
	if req.Msg.BudgetMin != nil {
		budgetMin = *req.Msg.BudgetMin
	}
	if req.Msg.BudgetMax != nil {
		budgetMax = *req.Msg.BudgetMax
	}

	rows, err := s.db.Query(ctx, `
		SELECT 
			id, org_id, project_id, name, industry, contact_email, contact_phone,
			website, address, budget_min, budget_max, preferences_json, status, notes,
			created_at, updated_at
		FROM sponsors
		WHERE org_id = $1
			AND ($2::varchar IS NULL OR name ILIKE '%' || $2 || '%' OR contact_email ILIKE '%' || $2 || '%')
			AND ($3::varchar IS NULL OR industry = $3)
			AND ($4::numeric IS NULL OR budget_min >= $4)
			AND ($5::numeric IS NULL OR budget_max <= $5)
			AND ($6::varchar IS NULL OR status = $6)
		ORDER BY created_at DESC
	`, orgID, req.Msg.Query, req.Msg.Industry, budgetMin, budgetMax, status)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var sponsors []*storyboardv1.Sponsor
	for rows.Next() {
		sponsor, err := scanSponsor(rows)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		sponsors = append(sponsors, sponsor)
	}

	return connect.NewResponse(&storyboardv1.SearchSponsorsResponse{
		Sponsors: sponsors,
	}), nil
}

// Helper functions

func scanSponsor(rows interface{ Scan(...interface{}) error }) (*storyboardv1.Sponsor, error) {
	var sponsor storyboardv1.Sponsor
	var id pgtype.UUID
	var projectID pgtype.UUID
	var industry, contactEmail, contactPhone, website, address, notes pgtype.Text
	var budgetMin, budgetMax pgtype.Numeric
	var preferencesJSON pgtype.JSONB
	var status string
	var createdAt, updatedAt pgtype.Timestamptz

	err := rows.Scan(
		&id, &sponsor.OrgId, &projectID, &sponsor.Name,
		&industry, &contactEmail, &contactPhone, &website, &address,
		&budgetMin, &budgetMax, &preferencesJSON, &status, &notes,
		&createdAt, &updatedAt,
	)
	if err != nil {
		return nil, err
	}

	sponsor.Id = pgUUIDToString(id)
	if projectID.Valid {
		projectIDStr := pgUUIDToString(projectID)
		sponsor.ProjectId = &projectIDStr
	}
	if industry.Valid {
		sponsor.Industry = &industry.String
	}
	if contactEmail.Valid {
		sponsor.ContactEmail = &contactEmail.String
	}
	if contactPhone.Valid {
		sponsor.ContactPhone = &contactPhone.String
	}
	if website.Valid {
		sponsor.Website = &website.String
	}
	if address.Valid {
		sponsor.Address = &address.String
	}
	if budgetMin.Valid {
		budgetMinFloat, _ := budgetMin.Float64Value()
		if budgetMinFloat.Valid {
			budgetMinStr := fmt.Sprintf("%.2f", budgetMinFloat.Float64)
			sponsor.BudgetMin = &budgetMinStr
		}
	}
	if budgetMax.Valid {
		budgetMaxFloat, _ := budgetMax.Float64Value()
		if budgetMaxFloat.Valid {
			budgetMaxStr := fmt.Sprintf("%.2f", budgetMaxFloat.Float64)
			sponsor.BudgetMax = &budgetMaxStr
		}
	}
	if preferencesJSON.Valid {
		var prefs map[string]interface{}
		if err := json.Unmarshal(preferencesJSON.Bytes, &prefs); err == nil {
			sponsor.Preferences = make(map[string]string)
			for k, v := range prefs {
				if str, ok := v.(string); ok {
					sponsor.Preferences[k] = str
				} else {
					sponsor.Preferences[k] = fmt.Sprintf("%v", v)
				}
			}
		}
	}
	sponsor.Status = stringToSponsorStatus(status)
	if notes.Valid {
		sponsor.Notes = &notes.String
	}
	if createdAt.Valid {
		sponsor.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
	}
	if updatedAt.Valid {
		sponsor.UpdatedAt = updatedAt.Time.Format("2006-01-02T15:04:05Z")
	}

	return &sponsor, nil
}

func scanSponsorContact(rows interface{ Scan(...interface{}) error }) (*storyboardv1.SponsorContact, error) {
	var contact storyboardv1.SponsorContact
	var id, sponsorID pgtype.UUID
	var role, email, phone pgtype.Text
	var isPrimary bool
	var createdAt, updatedAt pgtype.Timestamptz

	err := rows.Scan(
		&id, &sponsorID, &contact.ContactName, &role, &email, &phone, &isPrimary,
		&createdAt, &updatedAt,
	)
	if err != nil {
		return nil, err
	}

	contact.Id = pgUUIDToString(id)
	contact.SponsorId = pgUUIDToString(sponsorID)
	if role.Valid {
		contact.Role = &role.String
	}
	if email.Valid {
		contact.Email = &email.String
	}
	if phone.Valid {
		contact.Phone = &phone.String
	}
	contact.IsPrimary = isPrimary
	if createdAt.Valid {
		contact.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
	}
	if updatedAt.Valid {
		contact.UpdatedAt = updatedAt.Time.Format("2006-01-02T15:04:05Z")
	}

	return &contact, nil
}

func sponsorStatusToString(status storyboardv1.SponsorStatus) string {
	switch status {
	case storyboardv1.SponsorStatus_SPONSOR_STATUS_PROSPECT:
		return "prospect"
	case storyboardv1.SponsorStatus_SPONSOR_STATUS_CONTACTED:
		return "contacted"
	case storyboardv1.SponsorStatus_SPONSOR_STATUS_NEGOTIATING:
		return "negotiating"
	case storyboardv1.SponsorStatus_SPONSOR_STATUS_APPROVED:
		return "approved"
	case storyboardv1.SponsorStatus_SPONSOR_STATUS_REJECTED:
		return "rejected"
	default:
		return "prospect"
	}
}

func stringToSponsorStatus(status string) storyboardv1.SponsorStatus {
	switch status {
	case "prospect":
		return storyboardv1.SponsorStatus_SPONSOR_STATUS_PROSPECT
	case "contacted":
		return storyboardv1.SponsorStatus_SPONSOR_STATUS_CONTACTED
	case "negotiating":
		return storyboardv1.SponsorStatus_SPONSOR_STATUS_NEGOTIATING
	case "approved":
		return storyboardv1.SponsorStatus_SPONSOR_STATUS_APPROVED
	case "rejected":
		return storyboardv1.SponsorStatus_SPONSOR_STATUS_REJECTED
	default:
		return storyboardv1.SponsorStatus_SPONSOR_STATUS_PROSPECT
	}
}

// ListSponsorContacts lists contacts for a sponsor
func (s *StoryboardService) ListSponsorContacts(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListSponsorContactsRequest],
) (*connect.Response[storyboardv1.ListSponsorContactsResponse], error) {
	sponsorID, err := uuid.Parse(req.Msg.SponsorId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	rows, err := s.db.Query(ctx, `
		SELECT id, sponsor_id, contact_name, role, email, phone, is_primary, created_at, updated_at
		FROM sponsor_contacts
		WHERE sponsor_id = $1
		ORDER BY is_primary DESC, contact_name
	`, sponsorID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var contacts []*storyboardv1.SponsorContact
	for rows.Next() {
		contact, err := scanSponsorContact(rows)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		contacts = append(contacts, contact)
	}

	return connect.NewResponse(&storyboardv1.ListSponsorContactsResponse{
		Contacts: contacts,
	}), nil
}

// CreateSponsorContact creates a new contact for a sponsor
func (s *StoryboardService) CreateSponsorContact(
	ctx context.Context,
	req *connect.Request[storyboardv1.CreateSponsorContactRequest],
) (*connect.Response[storyboardv1.CreateSponsorContactResponse], error) {
	sponsorID, err := uuid.Parse(req.Msg.SponsorId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	row := s.db.QueryRow(ctx, `
		INSERT INTO sponsor_contacts (sponsor_id, contact_name, role, email, phone, is_primary)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, sponsor_id, contact_name, role, email, phone, is_primary, created_at, updated_at
	`, sponsorID, req.Msg.ContactName, req.Msg.Role, req.Msg.Email, req.Msg.Phone, req.Msg.IsPrimary)

	contact, err := scanSponsorContact(row)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.CreateSponsorContactResponse{
		Contact: contact,
	}), nil
}

// UpdateSponsorContact updates a sponsor contact
func (s *StoryboardService) UpdateSponsorContact(
	ctx context.Context,
	req *connect.Request[storyboardv1.UpdateSponsorContactRequest],
) (*connect.Response[storyboardv1.UpdateSponsorContactResponse], error) {
	contactID, err := uuid.Parse(req.Msg.ContactId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	updates := []string{}
	args := []interface{}{contactID}
	argIndex := 2

	if req.Msg.ContactName != nil {
		updates = append(updates, fmt.Sprintf("contact_name = $%d", argIndex))
		args = append(args, *req.Msg.ContactName)
		argIndex++
	}
	if req.Msg.Role != nil {
		updates = append(updates, fmt.Sprintf("role = $%d", argIndex))
		args = append(args, *req.Msg.Role)
		argIndex++
	}
	if req.Msg.Email != nil {
		updates = append(updates, fmt.Sprintf("email = $%d", argIndex))
		args = append(args, *req.Msg.Email)
		argIndex++
	}
	if req.Msg.Phone != nil {
		updates = append(updates, fmt.Sprintf("phone = $%d", argIndex))
		args = append(args, *req.Msg.Phone)
		argIndex++
	}
	if req.Msg.IsPrimary != nil {
		updates = append(updates, fmt.Sprintf("is_primary = $%d", argIndex))
		args = append(args, *req.Msg.IsPrimary)
		argIndex++
	}

	if len(updates) == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("no fields to update"))
	}

	updates = append(updates, "updated_at = NOW()")
	updateClause := fmt.Sprintf("%s", updates[0])
	for i := 1; i < len(updates); i++ {
		updateClause = fmt.Sprintf("%s, %s", updateClause, updates[i])
	}

	query := fmt.Sprintf(`
		UPDATE sponsor_contacts
		SET %s
		WHERE id = $1
		RETURNING id, sponsor_id, contact_name, role, email, phone, is_primary, created_at, updated_at
	`, updateClause)

	row := s.db.QueryRow(ctx, query, args...)
	contact, err := scanSponsorContact(row)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.UpdateSponsorContactResponse{
		Contact: contact,
	}), nil
}

// DeleteSponsorContact deletes a sponsor contact
func (s *StoryboardService) DeleteSponsorContact(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteSponsorContactRequest],
) (*connect.Response[storyboardv1.DeleteSponsorContactResponse], error) {
	contactID, err := uuid.Parse(req.Msg.ContactId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	_, err = s.db.Exec(ctx, `DELETE FROM sponsor_contacts WHERE id = $1`, contactID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteSponsorContactResponse{
		Success: true,
	}), nil
}

// ListSponsorHistory lists history for a sponsor
func (s *StoryboardService) ListSponsorHistory(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListSponsorHistoryRequest],
) (*connect.Response[storyboardv1.ListSponsorHistoryResponse], error) {
	sponsorID, err := uuid.Parse(req.Msg.SponsorId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var eventType interface{}
	if req.Msg.EventType != nil && *req.Msg.EventType != storyboardv1.SponsorEventType_SPONSOR_EVENT_TYPE_UNSPECIFIED {
		eventType = sponsorEventTypeToString(*req.Msg.EventType)
	}

	rows, err := s.db.Query(ctx, `
		SELECT id, sponsor_id, event_type, event_date, description, metadata_json, created_at
		FROM sponsor_history
		WHERE sponsor_id = $1
			AND ($2::varchar IS NULL OR event_type = $2)
		ORDER BY event_date DESC, created_at DESC
	`, sponsorID, eventType)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var history []*storyboardv1.SponsorHistory
	for rows.Next() {
		h, err := scanSponsorHistory(rows)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		history = append(history, h)
	}

	return connect.NewResponse(&storyboardv1.ListSponsorHistoryResponse{
		History: history,
	}), nil
}

// CreateSponsorHistory creates a new history entry
func (s *StoryboardService) CreateSponsorHistory(
	ctx context.Context,
	req *connect.Request[storyboardv1.CreateSponsorHistoryRequest],
) (*connect.Response[storyboardv1.CreateSponsorHistoryResponse], error) {
	sponsorID, err := uuid.Parse(req.Msg.SponsorId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	metadataJSON, err := json.Marshal(req.Msg.Metadata)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var eventDate interface{}
	if req.Msg.EventDate != nil {
		eventDate = *req.Msg.EventDate
	}

	row := s.db.QueryRow(ctx, `
		INSERT INTO sponsor_history (sponsor_id, event_type, event_date, description, metadata_json)
		VALUES ($1, $2, COALESCE($3, NOW()), $4, $5)
		RETURNING id, sponsor_id, event_type, event_date, description, metadata_json, created_at
	`, sponsorID, sponsorEventTypeToString(req.Msg.EventType), eventDate, req.Msg.Description, metadataJSON)

	history, err := scanSponsorHistory(row)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.CreateSponsorHistoryResponse{
		History: history,
	}), nil
}

// ContactSponsor records a contact event
func (s *StoryboardService) ContactSponsor(
	ctx context.Context,
	req *connect.Request[storyboardv1.ContactSponsorRequest],
) (*connect.Response[storyboardv1.ContactSponsorResponse], error) {
	sponsorID, err := uuid.Parse(req.Msg.SponsorId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	metadata := req.Msg.Metadata
	if metadata == nil {
		metadata = make(map[string]string)
	}
	metadata["contact_method"] = req.Msg.ContactMethod

	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var eventDate interface{}
	if req.Msg.ContactDate != nil {
		eventDate = *req.Msg.ContactDate
	}

	row := s.db.QueryRow(ctx, `
		INSERT INTO sponsor_history (sponsor_id, event_type, event_date, description, metadata_json)
		VALUES ($1, 'contact', COALESCE($2, NOW()), $3, $4)
		RETURNING id, sponsor_id, event_type, event_date, description, metadata_json, created_at
	`, sponsorID, eventDate, req.Msg.Description, metadataJSON)

	history, err := scanSponsorHistory(row)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.ContactSponsorResponse{
		History: history,
	}), nil
}

// UpdateSponsorStatus updates sponsor status and creates history entry
func (s *StoryboardService) UpdateSponsorStatus(
	ctx context.Context,
	req *connect.Request[storyboardv1.UpdateSponsorStatusRequest],
) (*connect.Response[storyboardv1.UpdateSponsorStatusResponse], error) {
	sponsorID, err := uuid.Parse(req.Msg.SponsorId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	// Update sponsor status
	row := s.db.QueryRow(ctx, `
		UPDATE sponsors
		SET status = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING 
			id, org_id, project_id, name, industry, contact_email, contact_phone,
			website, address, budget_min, budget_max, preferences_json, status, notes,
			created_at, updated_at
	`, sponsorStatusToString(req.Msg.Status), sponsorID)

	sponsor, err := scanSponsor(row)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Create history entry
	metadata := map[string]string{
		"old_status": "unknown", // Could be retrieved from previous state
		"new_status": sponsorStatusToString(req.Msg.Status),
	}
	if req.Msg.Notes != nil {
		metadata["notes"] = *req.Msg.Notes
	}
	metadataJSON, _ := json.Marshal(metadata)

	historyRow := s.db.QueryRow(ctx, `
		INSERT INTO sponsor_history (sponsor_id, event_type, event_date, description, metadata_json)
		VALUES ($1, 'status_change', NOW(), $2, $3)
		RETURNING id, sponsor_id, event_type, event_date, description, metadata_json, created_at
	`, sponsorID, req.Msg.Notes, metadataJSON)

	history, err := scanSponsorHistory(historyRow)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.UpdateSponsorStatusResponse{
		Sponsor: sponsor,
		History: history,
	}), nil
}

// ListSponsorPosts lists posts for sponsors
func (s *StoryboardService) ListSponsorPosts(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListSponsorPostsRequest],
) (*connect.Response[storyboardv1.ListSponsorPostsResponse], error) {
	orgID := req.Msg.OrgId
	if orgID == "" {
		orgID = auth.GetOrgIDFromContext(ctx)
	}

	var sponsorID interface{}
	if req.Msg.SponsorId != nil {
		parsedID, err := uuid.Parse(*req.Msg.SponsorId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		sponsorID = parsedID
	}

	var visibility interface{}
	if req.Msg.Visibility != nil && *req.Msg.Visibility != storyboardv1.SponsorPostVisibility_SPONSOR_POST_VISIBILITY_UNSPECIFIED {
		visibility = sponsorPostVisibilityToString(*req.Msg.Visibility)
	}

	rows, err := s.db.Query(ctx, `
		SELECT id, org_id, sponsor_id, title, content, visibility, posted_at, created_at, updated_at
		FROM sponsor_posts
		WHERE org_id = $1
			AND ($2::uuid IS NULL OR sponsor_id = $2)
			AND ($3::varchar IS NULL OR visibility = $3)
		ORDER BY posted_at DESC
	`, orgID, sponsorID, visibility)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var posts []*storyboardv1.SponsorPost
	for rows.Next() {
		post, err := scanSponsorPost(rows)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		posts = append(posts, post)
	}

	return connect.NewResponse(&storyboardv1.ListSponsorPostsResponse{
		Posts: posts,
	}), nil
}

// CreateSponsorPost creates a new post
func (s *StoryboardService) CreateSponsorPost(
	ctx context.Context,
	req *connect.Request[storyboardv1.CreateSponsorPostRequest],
) (*connect.Response[storyboardv1.CreateSponsorPostResponse], error) {
	orgID := req.Msg.OrgId
	if orgID == "" {
		orgID = auth.GetOrgIDFromContext(ctx)
	}

	sponsorID, err := uuid.Parse(req.Msg.SponsorId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	row := s.db.QueryRow(ctx, `
		INSERT INTO sponsor_posts (org_id, sponsor_id, title, content, visibility, posted_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		RETURNING id, org_id, sponsor_id, title, content, visibility, posted_at, created_at, updated_at
	`, orgID, sponsorID, req.Msg.Title, req.Msg.Content, sponsorPostVisibilityToString(req.Msg.Visibility))

	post, err := scanSponsorPost(row)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.CreateSponsorPostResponse{
		Post: post,
	}), nil
}

// UpdateSponsorPost updates a post
func (s *StoryboardService) UpdateSponsorPost(
	ctx context.Context,
	req *connect.Request[storyboardv1.UpdateSponsorPostRequest],
) (*connect.Response[storyboardv1.UpdateSponsorPostResponse], error) {
	postID, err := uuid.Parse(req.Msg.PostId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	updates := []string{}
	args := []interface{}{postID}
	argIndex := 2

	if req.Msg.Title != nil {
		updates = append(updates, fmt.Sprintf("title = $%d", argIndex))
		args = append(args, *req.Msg.Title)
		argIndex++
	}
	if req.Msg.Content != nil {
		updates = append(updates, fmt.Sprintf("content = $%d", argIndex))
		args = append(args, *req.Msg.Content)
		argIndex++
	}
	if req.Msg.Visibility != nil {
		updates = append(updates, fmt.Sprintf("visibility = $%d", argIndex))
		args = append(args, sponsorPostVisibilityToString(*req.Msg.Visibility))
		argIndex++
	}

	if len(updates) == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("no fields to update"))
	}

	updates = append(updates, "updated_at = NOW()")
	updateClause := fmt.Sprintf("%s", updates[0])
	for i := 1; i < len(updates); i++ {
		updateClause = fmt.Sprintf("%s, %s", updateClause, updates[i])
	}

	query := fmt.Sprintf(`
		UPDATE sponsor_posts
		SET %s
		WHERE id = $1
		RETURNING id, org_id, sponsor_id, title, content, visibility, posted_at, created_at, updated_at
	`, updateClause)

	row := s.db.QueryRow(ctx, query, args...)
	post, err := scanSponsorPost(row)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.UpdateSponsorPostResponse{
		Post: post,
	}), nil
}

// DeleteSponsorPost deletes a post
func (s *StoryboardService) DeleteSponsorPost(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteSponsorPostRequest],
) (*connect.Response[storyboardv1.DeleteSponsorPostResponse], error) {
	postID, err := uuid.Parse(req.Msg.PostId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	_, err = s.db.Exec(ctx, `DELETE FROM sponsor_posts WHERE id = $1`, postID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteSponsorPostResponse{
		Success: true,
	}), nil
}

// Helper functions for scanning

func scanSponsorHistory(rows interface{ Scan(...interface{}) error }) (*storyboardv1.SponsorHistory, error) {
	var history storyboardv1.SponsorHistory
	var id, sponsorID pgtype.UUID
	var eventType string
	var eventDate, createdAt pgtype.Timestamptz
	var description pgtype.Text
	var metadataJSON pgtype.JSONB

	err := rows.Scan(&id, &sponsorID, &eventType, &eventDate, &description, &metadataJSON, &createdAt)
	if err != nil {
		return nil, err
	}

	history.Id = pgUUIDToString(id)
	history.SponsorId = pgUUIDToString(sponsorID)
	history.EventType = stringToSponsorEventType(eventType)
	if eventDate.Valid {
		history.EventDate = eventDate.Time.Format("2006-01-02T15:04:05Z")
	}
	if description.Valid {
		history.Description = &description.String
	}
	if metadataJSON.Valid {
		var metadata map[string]interface{}
		if err := json.Unmarshal(metadataJSON.Bytes, &metadata); err == nil {
			history.Metadata = make(map[string]string)
			for k, v := range metadata {
				if str, ok := v.(string); ok {
					history.Metadata[k] = str
				} else {
					history.Metadata[k] = fmt.Sprintf("%v", v)
				}
			}
		}
	}
	if createdAt.Valid {
		history.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
	}

	return &history, nil
}

func scanSponsorPost(rows interface{ Scan(...interface{}) error }) (*storyboardv1.SponsorPost, error) {
	var post storyboardv1.SponsorPost
	var id, sponsorID pgtype.UUID
	var visibility string
	var postedAt, createdAt, updatedAt pgtype.Timestamptz

	err := rows.Scan(&id, &post.OrgId, &sponsorID, &post.Title, &post.Content, &visibility, &postedAt, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}

	post.Id = pgUUIDToString(id)
	post.SponsorId = pgUUIDToString(sponsorID)
	post.Visibility = stringToSponsorPostVisibility(visibility)
	if postedAt.Valid {
		post.PostedAt = postedAt.Time.Format("2006-01-02T15:04:05Z")
	}
	if createdAt.Valid {
		post.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
	}
	if updatedAt.Valid {
		post.UpdatedAt = updatedAt.Time.Format("2006-01-02T15:04:05Z")
	}

	return &post, nil
}

func sponsorEventTypeToString(eventType storyboardv1.SponsorEventType) string {
	switch eventType {
	case storyboardv1.SponsorEventType_SPONSOR_EVENT_TYPE_CONTACT:
		return "contact"
	case storyboardv1.SponsorEventType_SPONSOR_EVENT_TYPE_MEETING:
		return "meeting"
	case storyboardv1.SponsorEventType_SPONSOR_EVENT_TYPE_PROPOSAL:
		return "proposal"
	case storyboardv1.SponsorEventType_SPONSOR_EVENT_TYPE_RESPONSE:
		return "response"
	case storyboardv1.SponsorEventType_SPONSOR_EVENT_TYPE_STATUS_CHANGE:
		return "status_change"
	default:
		return "contact"
	}
}

func stringToSponsorEventType(eventType string) storyboardv1.SponsorEventType {
	switch eventType {
	case "contact":
		return storyboardv1.SponsorEventType_SPONSOR_EVENT_TYPE_CONTACT
	case "meeting":
		return storyboardv1.SponsorEventType_SPONSOR_EVENT_TYPE_MEETING
	case "proposal":
		return storyboardv1.SponsorEventType_SPONSOR_EVENT_TYPE_PROPOSAL
	case "response":
		return storyboardv1.SponsorEventType_SPONSOR_EVENT_TYPE_RESPONSE
	case "status_change":
		return storyboardv1.SponsorEventType_SPONSOR_EVENT_TYPE_STATUS_CHANGE
	default:
		return storyboardv1.SponsorEventType_SPONSOR_EVENT_TYPE_CONTACT
	}
}

func sponsorPostVisibilityToString(visibility storyboardv1.SponsorPostVisibility) string {
	switch visibility {
	case storyboardv1.SponsorPostVisibility_SPONSOR_POST_VISIBILITY_PUBLIC:
		return "public"
	case storyboardv1.SponsorPostVisibility_SPONSOR_POST_VISIBILITY_ORG:
		return "org"
	case storyboardv1.SponsorPostVisibility_SPONSOR_POST_VISIBILITY_PRIVATE:
		return "private"
	default:
		return "org"
	}
}

func stringToSponsorPostVisibility(visibility string) storyboardv1.SponsorPostVisibility {
	switch visibility {
	case "public":
		return storyboardv1.SponsorPostVisibility_SPONSOR_POST_VISIBILITY_PUBLIC
	case "org":
		return storyboardv1.SponsorPostVisibility_SPONSOR_POST_VISIBILITY_ORG
	case "private":
		return storyboardv1.SponsorPostVisibility_SPONSOR_POST_VISIBILITY_PRIVATE
	default:
		return storyboardv1.SponsorPostVisibility_SPONSOR_POST_VISIBILITY_ORG
	}
}
