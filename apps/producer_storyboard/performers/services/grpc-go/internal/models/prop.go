package models

import (
	"encoding/json"
	"time"
)

// Prop represents a prop/item
type Prop struct {
	ID                  string          `db:"id"`
	ProjectID           string          `db:"project_id"`
	OrgID               *string         `db:"org_id"`
	Name                string          `db:"name"`
	Description         *string         `db:"description"`
	Category            *string         `db:"category"`
	Material            *string         `db:"material"`
	Size                *string         `db:"size"`
	WeightKg            *float64        `db:"weight_kg"`
	ValueAmount         *float64        `db:"value_amount"`
	ValueCurrency       string          `db:"value_currency"`
	Rarity              *string         `db:"rarity"`
	FunctionDescription *string         `db:"function_description"`
	OwnerCharacterID    *string         `db:"owner_character_id"`
	LocationID          *string         `db:"location_id"`
	RelatedTechnologyID *string         `db:"related_technology_id"`
	Tags                []string        `db:"tags"`
	AttributesJSON      json.RawMessage `db:"attributes_json"`
	CreatedAt           time.Time       `db:"created_at"`
	UpdatedAt           time.Time       `db:"updated_at"`
}

// PropImage represents a prop image from a specific angle
type PropImage struct {
	ID          string    `db:"id"`
	PropID      string    `db:"prop_id"`
	Angle       string    `db:"angle"`
	ImageData   []byte    `db:"image_data"`
	ImageFormat string    `db:"image_format"`
	Width       *int      `db:"width"`
	Height      *int      `db:"height"`
	IsPrimary   bool      `db:"is_primary"`
	CreatedAt   time.Time `db:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"`
}

// Prop3DModel represents a 3D model for a prop
type Prop3DModel struct {
	ID          string          `db:"id"`
	PropID      string          `db:"prop_id"`
	ModelFormat string          `db:"model_format"`
	ModelData   []byte          `db:"model_data"`
	TextureData [][]byte        `db:"texture_data"`
	IsPrimary   bool            `db:"is_primary"`
	Metadata    json.RawMessage `db:"metadata"`
	CreatedAt   time.Time       `db:"created_at"`
	UpdatedAt   time.Time       `db:"updated_at"`
}
