package models

import (
	"encoding/json"
	"time"
)

// WorldSetting represents a world/setting configuration
type WorldSetting struct {
	ID             string          `db:"id"`
	ProjectID      string          `db:"project_id"`
	OrgID          *string         `db:"org_id"`
	Name           string          `db:"name"`
	Description    *string         `db:"description"`
	SettingType    *string         `db:"setting_type"` // 'fictional', 'real_world', 'alternate_reality', etc.
	TimePeriod     *string         `db:"time_period"`
	Geography      *string         `db:"geography"`
	Climate        *string         `db:"climate"`
	Culture        *string         `db:"culture"`
	Politics       *string         `db:"politics"`
	Economy        *string         `db:"economy"`
	MagicSystem    *string         `db:"magic_system"`
	Rules          *string         `db:"rules"`
	History        *string         `db:"history"`
	AttributesJSON json.RawMessage `db:"attributes_json"`
	CreatedAt      time.Time       `db:"created_at"`
	UpdatedAt      time.Time       `db:"updated_at"`
}
