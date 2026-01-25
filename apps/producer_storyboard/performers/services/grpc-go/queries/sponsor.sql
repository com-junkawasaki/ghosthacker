-- name: ListSponsors :many
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
ORDER BY created_at DESC;

-- name: GetSponsor :one
SELECT 
  id, org_id, project_id, name, industry, contact_email, contact_phone,
  website, address, budget_min, budget_max, preferences_json, status, notes,
  created_at, updated_at
FROM sponsors
WHERE id = $1;

-- name: CreateSponsor :one
INSERT INTO sponsors (
  org_id, project_id, name, industry, contact_email, contact_phone,
  website, address, budget_min, budget_max, preferences_json, notes, status
)
VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13, 'prospect')
)
RETURNING 
  id, org_id, project_id, name, industry, contact_email, contact_phone,
  website, address, budget_min, budget_max, preferences_json, status, notes,
  created_at, updated_at;

-- name: UpdateSponsor :one
UPDATE sponsors
SET 
  name = COALESCE($2, name),
  industry = COALESCE($3, industry),
  contact_email = COALESCE($4, contact_email),
  contact_phone = COALESCE($5, contact_phone),
  website = COALESCE($6, website),
  address = COALESCE($7, address),
  budget_min = COALESCE($8, budget_min),
  budget_max = COALESCE($9, budget_max),
  preferences_json = COALESCE($10, preferences_json),
  status = COALESCE($11, status),
  notes = COALESCE($12, notes),
  updated_at = NOW()
WHERE id = $1
RETURNING 
  id, org_id, project_id, name, industry, contact_email, contact_phone,
  website, address, budget_min, budget_max, preferences_json, status, notes,
  created_at, updated_at;

-- name: DeleteSponsor :exec
DELETE FROM sponsors
WHERE id = $1;

-- name: ListSponsorContacts :many
SELECT 
  id, sponsor_id, contact_name, role, email, phone, is_primary,
  created_at, updated_at
FROM sponsor_contacts
WHERE sponsor_id = $1
ORDER BY is_primary DESC, contact_name;

-- name: GetSponsorContact :one
SELECT 
  id, sponsor_id, contact_name, role, email, phone, is_primary,
  created_at, updated_at
FROM sponsor_contacts
WHERE id = $1;

-- name: CreateSponsorContact :one
INSERT INTO sponsor_contacts (
  sponsor_id, contact_name, role, email, phone, is_primary
)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING 
  id, sponsor_id, contact_name, role, email, phone, is_primary,
  created_at, updated_at;

-- name: UpdateSponsorContact :one
UPDATE sponsor_contacts
SET 
  contact_name = COALESCE($2, contact_name),
  role = COALESCE($3, role),
  email = COALESCE($4, email),
  phone = COALESCE($5, phone),
  is_primary = COALESCE($6, is_primary),
  updated_at = NOW()
WHERE id = $1
RETURNING 
  id, sponsor_id, contact_name, role, email, phone, is_primary,
  created_at, updated_at;

-- name: DeleteSponsorContact :exec
DELETE FROM sponsor_contacts
WHERE id = $1;

-- name: ListSponsorHistory :many
SELECT 
  id, sponsor_id, event_type, event_date, description, metadata_json, created_at
FROM sponsor_history
WHERE sponsor_id = $1
  AND ($2::varchar IS NULL OR event_type = $2)
ORDER BY event_date DESC, created_at DESC;

-- name: CreateSponsorHistory :one
INSERT INTO sponsor_history (
  sponsor_id, event_type, event_date, description, metadata_json
)
VALUES ($1, $2, COALESCE($3, NOW()), $4, $5)
RETURNING 
  id, sponsor_id, event_type, event_date, description, metadata_json, created_at;

-- name: ListSponsorPosts :many
SELECT 
  id, org_id, sponsor_id, title, content, visibility, posted_at,
  created_at, updated_at
FROM sponsor_posts
WHERE org_id = $1
  AND ($2::uuid IS NULL OR sponsor_id = $2)
  AND ($3::varchar IS NULL OR visibility = $3)
ORDER BY posted_at DESC;

-- name: GetSponsorPost :one
SELECT 
  id, org_id, sponsor_id, title, content, visibility, posted_at,
  created_at, updated_at
FROM sponsor_posts
WHERE id = $1;

-- name: CreateSponsorPost :one
INSERT INTO sponsor_posts (
  org_id, sponsor_id, title, content, visibility, posted_at
)
VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()))
RETURNING 
  id, org_id, sponsor_id, title, content, visibility, posted_at,
  created_at, updated_at;

-- name: UpdateSponsorPost :one
UPDATE sponsor_posts
SET 
  title = COALESCE($2, title),
  content = COALESCE($3, content),
  visibility = COALESCE($4, visibility),
  updated_at = NOW()
WHERE id = $1
RETURNING 
  id, org_id, sponsor_id, title, content, visibility, posted_at,
  created_at, updated_at;

-- name: DeleteSponsorPost :exec
DELETE FROM sponsor_posts
WHERE id = $1;
