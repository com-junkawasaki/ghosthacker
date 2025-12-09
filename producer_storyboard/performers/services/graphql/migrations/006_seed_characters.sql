-- Seed sample characters and dialogues for testing

-- Insert sample characters for the first project
-- Note: This assumes there's at least one project in storyboard_projects
INSERT INTO characters (id, project_id, name, description, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    p.id,
    'Alice',
    'Main protagonist - a curious and adventurous character',
    NOW(),
    NOW()
FROM storyboard_projects p
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO characters (id, project_id, name, description, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    p.id,
    'Bob',
    'Supporting character - friendly and helpful',
    NOW(),
    NOW()
FROM storyboard_projects p
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert sample dialogues for the first scene
-- Note: This assumes there's at least one scene in scenes
INSERT INTO dialogues (id, scene_id, character_id, language, text, order_index, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    s.id,
    c.id,
    'ja',
    'こんにちは、今日はいい天気ですね。',
    0,
    NOW(),
    NOW()
FROM scenes s
CROSS JOIN characters c
WHERE c.name = 'Alice'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO dialogues (id, scene_id, character_id, language, text, order_index, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    s.id,
    c.id,
    'ja',
    'はい、本当に素晴らしい日です！',
    1,
    NOW(),
    NOW()
FROM scenes s
CROSS JOIN characters c
WHERE c.name = 'Bob'
LIMIT 1
ON CONFLICT DO NOTHING;

