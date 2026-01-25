-- Manga Editor Database Schema
-- Migration: 001_manga_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- マンガプロジェクト（ルートエンティティ）
CREATE TABLE manga_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ストーリー（story_draft.jsonld）
CREATE TABLE manga_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES manga_projects(id) ON DELETE CASCADE,
  story_id TEXT NOT NULL, -- 'gh:episode/draft-251121'
  title TEXT NOT NULL,
  temporal TEXT, -- '2026'
  description TEXT,
  theme JSONB, -- ['Spirit Evolution', 'Information Physics', ...]
  story_data JSONB NOT NULL, -- 完全なJSON-LDデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, story_id)
);

-- シーン（story_draft.jsonld の gh:scenes）
CREATE TABLE manga_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES manga_projects(id) ON DELETE CASCADE,
  story_id UUID REFERENCES manga_stories(id) ON DELETE CASCADE,
  scene_id TEXT NOT NULL, -- 'scene:01_Introduction'
  name TEXT NOT NULL,
  content TEXT,
  participants JSONB, -- ['character:Ren', 'character:Nei', ...]
  action JSONB, -- ['Ren activates SIP Device', ...]
  scene_data JSONB NOT NULL, -- 完全なJSON-LDデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, scene_id)
);

-- キャラクタープロフィール（character_profiles.jsonld）
CREATE TABLE manga_character_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES manga_projects(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL, -- 'gh:profiles/episode01-characters-v2'
  title TEXT NOT NULL,
  characters JSONB NOT NULL, -- キャラクター配列の完全なJSON-LDデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, profile_id)
);

-- 会社プロフィール（company_profile.jsonld）
CREATE TABLE manga_company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES manga_projects(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL, -- 'gh:company/DaimonConstruction'
  name TEXT NOT NULL,
  location JSONB,
  employee_count INTEGER,
  founding_date TEXT,
  business_type TEXT,
  atmosphere TEXT,
  incident_report JSONB,
  company_data JSONB NOT NULL, -- 完全なJSON-LDデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, company_id)
);

-- 生成プロンプト（generation_prompts.jsonld）
CREATE TABLE manga_generation_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES manga_projects(id) ON DELETE CASCADE,
  prompt_id TEXT NOT NULL, -- 'gh:generationPrompts/episode01'
  style_prompt_en TEXT,
  scene_prompts JSONB, -- シーンプロンプト配列
  panel_prompts JSONB, -- パネルプロンプト配列
  prompt_data JSONB NOT NULL, -- 完全なJSON-LDデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, prompt_id)
);

-- マンガスクリプト（manga_script.jsonld）
CREATE TABLE manga_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES manga_projects(id) ON DELETE CASCADE,
  script_id TEXT NOT NULL, -- 'gh:script/episode01-v3'
  title TEXT NOT NULL,
  page_count INTEGER,
  script_data JSONB NOT NULL, -- 完全なJSON-LDデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, script_id)
);

-- ページ（manga_script.jsonld の gh:pages）
CREATE TABLE manga_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES manga_projects(id) ON DELETE CASCADE,
  script_id UUID REFERENCES manga_scripts(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL, -- 'page:1', 'page:2-3'
  page_type TEXT, -- 'gh:SpreadPage' (見開きページ)
  description TEXT,
  page_number INTEGER, -- 抽出したページ番号
  width INTEGER DEFAULT 1200,
  height INTEGER DEFAULT 1800,
  konva_stage_json JSONB, -- Konva Stage.toJSON()の完全なデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(script_id, page_id)
);

-- パネル（manga_script.jsonld の gh:panels）
CREATE TABLE manga_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES manga_projects(id) ON DELETE CASCADE,
  page_id UUID REFERENCES manga_pages(id) ON DELETE CASCADE,
  panel_id INTEGER NOT NULL, -- panel:id
  layout TEXT, -- 'FullSpread', 'Grid', etc.
  visual TEXT, -- ビジュアル説明
  dialogue JSONB, -- [{"speaker": "Ren", "text": "..."}, ...]
  x INTEGER,
  y INTEGER,
  width INTEGER,
  height INTEGER,
  z_index INTEGER DEFAULT 0,
  image_url TEXT, -- 生成画像URL
  image_base64 TEXT, -- Base64エンコード画像
  panel_data JSONB NOT NULL, -- 完全なJSON-LDデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_id, panel_id)
);

-- レイヤー（Konva Layer管理）
CREATE TABLE manga_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES manga_projects(id) ON DELETE CASCADE,
  panel_id UUID REFERENCES manga_panels(id) ON DELETE CASCADE,
  layer_name TEXT NOT NULL,
  layer_type TEXT NOT NULL, -- 'image', 'drawing', 'text', 'speech_bubble'
  z_index INTEGER DEFAULT 0,
  visible BOOLEAN DEFAULT TRUE,
  opacity REAL DEFAULT 1.0,
  konva_data JSONB, -- Konva Layer/Node のJSONデータ（Stage.toJSON()形式）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 吹き出し（パネル内のセリフ）
CREATE TABLE manga_speech_bubbles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES manga_projects(id) ON DELETE CASCADE,
  panel_id UUID REFERENCES manga_panels(id) ON DELETE CASCADE,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  text TEXT NOT NULL,
  speaker TEXT, -- 'Ren', 'Nei', 'Narration', etc.
  bubble_type TEXT NOT NULL, -- 'speech', 'thought', 'shout'
  font_size INTEGER DEFAULT 16,
  font_family TEXT DEFAULT 'sans-serif',
  konva_node_id TEXT, -- Konva Node ID（Stage.toJSON()との対応）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 生成画像（AI生成画像の管理）
CREATE TABLE manga_generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES manga_projects(id) ON DELETE CASCADE,
  panel_id UUID REFERENCES manga_panels(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  image_url TEXT,
  image_base64 TEXT, -- Base64エンコード画像
  provider TEXT NOT NULL, -- 'fal', 'deepinfra', 'openai'
  model TEXT NOT NULL, -- 'Kivotos XL 2.0', 'NoobAI XL', etc.
  model_id TEXT, -- fal.ai/deepinfraのモデルID
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AIモデル定義（fal.ai/DeepInfraのモデル情報）
CREATE TABLE manga_ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- 'fal', 'deepinfra'
  model_id TEXT NOT NULL, -- fal.ai/deepinfraのモデルID
  model_name TEXT NOT NULL, -- 'Kivotos XL 2.0'
  model_type TEXT NOT NULL, -- 'SDXL', 'SD1.5', etc.
  preview_image_url TEXT, -- モデルプレビュー画像
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, model_id)
);

-- プロンプトタグ
CREATE TABLE manga_prompt_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_name TEXT NOT NULL UNIQUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_manga_pages_project ON manga_pages(project_id);
CREATE INDEX idx_manga_pages_script ON manga_pages(script_id);
CREATE INDEX idx_manga_panels_page ON manga_panels(page_id);
CREATE INDEX idx_manga_panels_project ON manga_panels(project_id);
CREATE INDEX idx_manga_layers_panel ON manga_layers(panel_id);
CREATE INDEX idx_manga_speech_bubbles_panel ON manga_speech_bubbles(panel_id);
CREATE INDEX idx_manga_generated_images_project ON manga_generated_images(project_id);
CREATE INDEX idx_manga_generated_images_panel ON manga_generated_images(panel_id);
CREATE INDEX idx_manga_scenes_story ON manga_scenes(story_id);

