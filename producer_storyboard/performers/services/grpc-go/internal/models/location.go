package models

import (
	"encoding/json"
	"time"
)

// Location represents a location with extended attributes
type Location struct {
	ID               string          `db:"id"`
	ProjectID        string          `db:"project_id"`
	OrgID            *string         `db:"org_id"`
	Name             string          `db:"name"`
	Description      *string         `db:"description"`
	ParentLocationID *string         `db:"parent_location_id"`
	ImageID          *string         `db:"image_id"`
	LocationType     *string         `db:"location_type"`
	Address          *string         `db:"address"`
	Latitude         *float64        `db:"latitude"`
	Longitude        *float64        `db:"longitude"`
	SizeSqm          *float64        `db:"size_sqm"`
	Capacity         *int            `db:"capacity"`
	Atmosphere       *string         `db:"atmosphere"`
	Accessibility    *string         `db:"accessibility"`
	SafetyLevel      *string         `db:"safety_level"`
	Metadata         json.RawMessage `db:"metadata"`
	CreatedAt        time.Time       `db:"created_at"`
	UpdatedAt        time.Time       `db:"updated_at"`
}

// LocationImage represents a location image from a specific angle
type LocationImage struct {
	ID          string    `db:"id"`
	LocationID  string    `db:"location_id"`
	Angle       string    `db:"angle"`
	ImageData   []byte    `db:"image_data"`
	ImageFormat string    `db:"image_format"`
	Width       *int      `db:"width"`
	Height      *int      `db:"height"`
	IsPrimary   bool      `db:"is_primary"`
	CreatedAt   time.Time `db:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"`
}

// Location3DModel represents a 3D model for a location
type Location3DModel struct {
	ID          string          `db:"id"`
	LocationID  string          `db:"location_id"`
	ModelFormat string          `db:"model_format"`
	ModelData   []byte          `db:"model_data"`
	TextureData [][]byte        `db:"texture_data"`
	IsPrimary   bool            `db:"is_primary"`
	Metadata    json.RawMessage `db:"metadata"`
	CreatedAt   time.Time       `db:"created_at"`
	UpdatedAt   time.Time       `db:"updated_at"`
}
