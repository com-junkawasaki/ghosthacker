package models

import (
	"encoding/json"
	"time"
)

// Character represents a character with extended attributes
type Character struct {
	ID                 string          `db:"id"`
	ProjectID          string          `db:"project_id"`
	Name               string          `db:"name"`
	Description        *string         `db:"description"`
	Personality        *string         `db:"personality"`
	Background         *string         `db:"background"`
	DefaultHumeVoiceID *string         `db:"default_hume_voice_id"`
	ProfileImageID     *string         `db:"profile_image_id"`
	Age                *int            `db:"age"`
	Gender             *string         `db:"gender"`
	BirthDate          *time.Time      `db:"birth_date"`
	HeightCm           *int            `db:"height_cm"`
	WeightKg           *float64        `db:"weight_kg"`
	HairColor          *string         `db:"hair_color"`
	EyeColor           *string         `db:"eye_color"`
	OccupationID       *string         `db:"occupation_id"`
	OrganizationID     *string         `db:"organization_id"`
	AttributesJSON     json.RawMessage `db:"attributes_json"`
	CreatedAt          time.Time       `db:"created_at"`
	UpdatedAt          time.Time       `db:"updated_at"`
}

// CharacterImage represents a character image from a specific angle
type CharacterImage struct {
	ID          string    `db:"id"`
	CharacterID string    `db:"character_id"`
	Angle       string    `db:"angle"` // front, side_left, side_right, back, etc.
	ImageData   []byte    `db:"image_data"`
	ImageFormat string    `db:"image_format"`
	Width       *int      `db:"width"`
	Height      *int      `db:"height"`
	IsPrimary   bool      `db:"is_primary"`
	CreatedAt   time.Time `db:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"`
}

// Character3DModel represents a 3D model for a character
type Character3DModel struct {
	ID          string          `db:"id"`
	CharacterID string          `db:"character_id"`
	ModelFormat string          `db:"model_format"` // glb, gltf, fbx, obj
	ModelData   []byte          `db:"model_data"`
	TextureData [][]byte        `db:"texture_data"` // Array of texture files
	IsPrimary   bool            `db:"is_primary"`
	Metadata    json.RawMessage `db:"metadata"`
	CreatedAt   time.Time       `db:"created_at"`
	UpdatedAt   time.Time       `db:"updated_at"`
}
