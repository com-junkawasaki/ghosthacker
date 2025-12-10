-- Seed test characters and voices for development

-- Insert test characters for the sample project
INSERT INTO characters (id, project_id, name, description, created_at, updated_at)
SELECT 
    '11111111-1111-1111-1111-111111111111'::uuid,
    p.id,
    'Test Character 1',
    'Test character for voice testing - Japanese speaker',
    NOW(),
    NOW()
FROM storyboard_projects p
WHERE p.id = '5e6c7387-ae70-4c0e-96f3-8110f2fd28a5'
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

INSERT INTO characters (id, project_id, name, description, created_at, updated_at)
SELECT 
    '22222222-2222-2222-2222-222222222222'::uuid,
    p.id,
    'Test Character 2',
    'Test character for voice testing - English speaker',
    NOW(),
    NOW()
FROM storyboard_projects p
WHERE p.id = '5e6c7387-ae70-4c0e-96f3-8110f2fd28a5'
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

INSERT INTO characters (id, project_id, name, description, created_at, updated_at)
SELECT 
    '33333333-3333-3333-3333-333333333333'::uuid,
    p.id,
    'Test Character 3',
    'Test character for voice testing - Hindi speaker',
    NOW(),
    NOW()
FROM storyboard_projects p
WHERE p.id = '5e6c7387-ae70-4c0e-96f3-8110f2fd28a5'
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Insert test dialogues with voice IDs for the first scene
-- Note: These voice IDs are placeholders - replace with actual Hume AI voice IDs when available
INSERT INTO dialogues (id, scene_id, character_id, language, text, hume_voice_id, order_index, created_at, updated_at)
SELECT 
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    s.id,
    c.id,
    'ja',
    'これはテスト用のセリフです。音声生成をテストできます。',
    'test-voice-ja-001', -- Placeholder voice ID
    0,
    NOW(),
    NOW()
FROM scenes s
CROSS JOIN characters c
WHERE s.storyboard_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND c.id = '11111111-1111-1111-1111-111111111111'::uuid
  AND s.scene_number = 1
LIMIT 1
ON CONFLICT (id) DO UPDATE SET 
    text = EXCLUDED.text,
    hume_voice_id = EXCLUDED.hume_voice_id,
    updated_at = NOW();

INSERT INTO dialogues (id, scene_id, character_id, language, text, hume_voice_id, order_index, created_at, updated_at)
SELECT 
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    s.id,
    c.id,
    'en',
    'This is a test dialogue. You can test voice generation.',
    'test-voice-en-001', -- Placeholder voice ID
    1,
    NOW(),
    NOW()
FROM scenes s
CROSS JOIN characters c
WHERE s.storyboard_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND c.id = '22222222-2222-2222-2222-222222222222'::uuid
  AND s.scene_number = 1
LIMIT 1
ON CONFLICT (id) DO UPDATE SET 
    text = EXCLUDED.text,
    hume_voice_id = EXCLUDED.hume_voice_id,
    updated_at = NOW();

INSERT INTO dialogues (id, scene_id, character_id, language, text, hume_voice_id, order_index, created_at, updated_at)
SELECT 
    'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
    s.id,
    c.id,
    'hi',
    'यह एक परीक्षण संवाद है। आप आवाज़ उत्पादन का परीक्षण कर सकते हैं।',
    'test-voice-hi-001', -- Placeholder voice ID
    2,
    NOW(),
    NOW()
FROM scenes s
CROSS JOIN characters c
WHERE s.storyboard_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND c.id = '33333333-3333-3333-3333-333333333333'::uuid
  AND s.scene_number = 1
LIMIT 1
ON CONFLICT (id) DO UPDATE SET 
    text = EXCLUDED.text,
    hume_voice_id = EXCLUDED.hume_voice_id,
    updated_at = NOW();


