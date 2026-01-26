-- Props and Extended Characters/Locations Support
-- Adds props table with multi-angle images and 3D models
-- Extends characters and locations tables with multi-angle images and 3D models
-- Adds world_settings table

-- ============================================================================
-- Props Tables
-- ============================================================================

-- Propsテーブル
CREATE TABLE IF NOT EXISTS props (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES storyboard_projects(id) ON DELETE CASCADE,
    org_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) CHECK (category IN ('Weapons', 'Tools', 'Furniture', 'Vehicles', 'Food & Drinks', 'Electronics', 'Clothing', 'Accessories', 'Musical Instruments', 'Sports Equipment', 'Bags & Luggage', 'Other')),
    material VARCHAR(100),
    size VARCHAR(100),
    weight_kg DECIMAL(10,2),
    value_amount DECIMAL(15,2),
    value_currency VARCHAR(10) DEFAULT 'JPY',
    rarity VARCHAR(20) CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    function_description TEXT,
    owner_character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    related_technology_id UUID REFERENCES jsonld_nodes(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    attributes_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_props_project_id ON props(project_id);
CREATE INDEX IF NOT EXISTS idx_props_org_id ON props(org_id);
CREATE INDEX IF NOT EXISTS idx_props_category ON props(category);
CREATE INDEX IF NOT EXISTS idx_props_owner_character_id ON props(owner_character_id);
CREATE INDEX IF NOT EXISTS idx_props_location_id ON props(location_id);
CREATE INDEX IF NOT EXISTS idx_props_tags ON props USING GIN(tags);

-- Prop Imagesテーブル（複数角度の画像）
CREATE TABLE IF NOT EXISTS prop_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prop_id UUID NOT NULL REFERENCES props(id) ON DELETE CASCADE,
    angle VARCHAR(20) NOT NULL CHECK (angle IN ('front', 'side_left', 'side_right', 'back', 'three_quarter_left', 'three_quarter_right', 'top', 'bottom', 'detail_1', 'detail_2', 'detail_3')),
    image_data BYTEA NOT NULL,
    image_format VARCHAR(10) NOT NULL DEFAULT 'png',
    width INTEGER,
    height INTEGER,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prop_images_prop_id ON prop_images(prop_id);
CREATE INDEX IF NOT EXISTS idx_prop_images_angle ON prop_images(prop_id, angle);

-- Prop 3D Modelsテーブル
CREATE TABLE IF NOT EXISTS prop_3d_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prop_id UUID NOT NULL REFERENCES props(id) ON DELETE CASCADE,
    model_format VARCHAR(10) NOT NULL CHECK (model_format IN ('glb', 'gltf', 'fbx', 'obj')),
    model_data BYTEA NOT NULL,
    texture_data BYTEA[], -- テクスチャファイルの配列
    is_primary BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb, -- スケール、回転、オフセットなどの情報
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prop_3d_models_prop_id ON prop_3d_models(prop_id);

-- ============================================================================
-- Characters Table Extensions
-- ============================================================================

-- Charactersテーブル（既存を拡張）
ALTER TABLE characters ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS height_cm INTEGER;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,2);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS hair_color VARCHAR(50);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS eye_color VARCHAR(50);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS occupation_id UUID REFERENCES jsonld_nodes(id) ON DELETE SET NULL;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS attributes_json JSONB DEFAULT '{}'::jsonb;

-- Character Imagesテーブル（複数角度の画像）
CREATE TABLE IF NOT EXISTS character_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    angle VARCHAR(20) NOT NULL CHECK (angle IN ('front', 'side_left', 'side_right', 'back', 'three_quarter_left', 'three_quarter_right', 'top', 'bottom')),
    image_data BYTEA NOT NULL,
    image_format VARCHAR(10) NOT NULL DEFAULT 'png',
    width INTEGER,
    height INTEGER,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_character_images_character_id ON character_images(character_id);
CREATE INDEX IF NOT EXISTS idx_character_images_angle ON character_images(character_id, angle);

-- Character 3D Modelsテーブル
CREATE TABLE IF NOT EXISTS character_3d_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    model_format VARCHAR(10) NOT NULL CHECK (model_format IN ('glb', 'gltf', 'fbx', 'obj')),
    model_data BYTEA NOT NULL,
    texture_data BYTEA[], -- テクスチャファイルの配列
    is_primary BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb, -- スケール、回転、オフセットなどの情報
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_character_3d_models_character_id ON character_3d_models(character_id);

-- ============================================================================
-- Locations Table Extensions
-- ============================================================================

-- Locationsテーブル（既存を拡張）
ALTER TABLE locations ADD COLUMN IF NOT EXISTS location_type VARCHAR(50);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS size_sqm DECIMAL(15, 2);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS atmosphere TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS accessibility TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS safety_level VARCHAR(20);

-- Location Imagesテーブル（複数角度の画像）
CREATE TABLE IF NOT EXISTS location_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    angle VARCHAR(20) NOT NULL CHECK (angle IN ('exterior_front', 'exterior_side', 'exterior_back', 'interior_main', 'interior_corner_1', 'interior_corner_2', 'interior_corner_3', 'interior_corner_4', 'aerial', 'detail_1', 'detail_2')),
    image_data BYTEA NOT NULL,
    image_format VARCHAR(10) NOT NULL DEFAULT 'png',
    width INTEGER,
    height INTEGER,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_images_location_id ON location_images(location_id);
CREATE INDEX IF NOT EXISTS idx_location_images_angle ON location_images(location_id, angle);

-- Location 3D Modelsテーブル
CREATE TABLE IF NOT EXISTS location_3d_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    model_format VARCHAR(10) NOT NULL CHECK (model_format IN ('glb', 'gltf', 'fbx', 'obj')),
    model_data BYTEA NOT NULL,
    texture_data BYTEA[],
    is_primary BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_3d_models_location_id ON location_3d_models(location_id);

-- ============================================================================
-- World Settings Table
-- ============================================================================

-- World Settingsテーブル
CREATE TABLE IF NOT EXISTS world_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES storyboard_projects(id) ON DELETE CASCADE,
    org_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    setting_type VARCHAR(50), -- 'fictional', 'real_world', 'alternate_reality', etc.
    time_period VARCHAR(100),
    geography TEXT,
    climate VARCHAR(100),
    culture TEXT,
    politics TEXT,
    economy TEXT,
    magic_system TEXT,
    rules TEXT,
    history TEXT,
    attributes_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_world_settings_project_id ON world_settings(project_id);
CREATE INDEX IF NOT EXISTS idx_world_settings_org_id ON world_settings(org_id);

-- ============================================================================
-- Org ID Propagation
-- ============================================================================

-- Create function to propagate org_id from projects to props and world_settings
CREATE OR REPLACE FUNCTION propagate_org_id_to_props_and_world_settings()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
        UPDATE props SET org_id = NEW.org_id WHERE project_id = NEW.id;
        UPDATE world_settings SET org_id = NEW.org_id WHERE project_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically propagate org_id changes
DROP TRIGGER IF EXISTS trigger_propagate_org_id_to_props_and_world_settings ON storyboard_projects;
CREATE TRIGGER trigger_propagate_org_id_to_props_and_world_settings
    AFTER UPDATE OF org_id ON storyboard_projects
    FOR EACH ROW
    EXECUTE FUNCTION propagate_org_id_to_props_and_world_settings();

-- Add comments
COMMENT ON TABLE props IS 'Props/items with multi-angle images and 3D models support';
COMMENT ON TABLE prop_images IS 'Multi-angle images for props';
COMMENT ON TABLE prop_3d_models IS '3D models for props (GLB/GLTF/FBX/OBJ)';
COMMENT ON TABLE character_images IS 'Multi-angle images for characters';
COMMENT ON TABLE character_3d_models IS '3D models for characters (GLB/GLTF/FBX/OBJ)';
COMMENT ON TABLE location_images IS 'Multi-angle images for locations';
COMMENT ON TABLE location_3d_models IS '3D models for locations (GLB/GLTF/FBX/OBJ)';
COMMENT ON TABLE world_settings IS 'World/setting configurations';
COMMENT ON COLUMN props.org_id IS 'Clerk organization ID (inherited from project)';
COMMENT ON COLUMN world_settings.org_id IS 'Clerk organization ID (inherited from project)';
