-- Seed departments
INSERT INTO departments (name, name_ja, type, display_order) VALUES
-- Production Leadership
('Executive Producer', 'エグゼクティブプロデューサー', 'production_leadership', 1),
('Producer', 'プロデューサー', 'production_leadership', 2),
('Associate Producer', 'アソシエイトプロデューサー', 'production_leadership', 3),
('Production Manager', '制作マネージャー', 'production_leadership', 4),

-- Creative Leadership
('Creative Director', 'クリエイティブディレクター', 'creative_leadership', 9),
('Director', '監督', 'creative_leadership', 10),
('Assistant Director', '副監督', 'creative_leadership', 11),
('Series Composition', 'シリーズ構成', 'creative_leadership', 12),
('Original Author', '原作', 'creative_leadership', 13),

-- Script Department
('Screenwriter', '脚本家', 'script', 20),
('Script Coordinator', '脚本協力', 'script', 21),
('Translator', '翻訳担当', 'script', 22),
('Localization', 'ローカライズ', 'script', 23),

-- Visual Department
('Chief Animation Director', '総作画監督', 'visual', 30),
('Character Designer', 'キャラクターデザイン', 'visual', 31),
('Animation Director', '作画監督', 'visual', 32),
('Art Director', '美術監督', 'visual', 33),
('Color Designer', '色彩設計', 'visual', 34),

-- Direction/Photography Department
('Storyboard Artist', '絵コンテ', 'direction', 40),
('Episode Director', '演出', 'direction', 41),
('Director of Photography', '撮影監督', 'direction', 42),
('CG Director', 'CGディレクター', 'direction', 43),

-- Audio Department
('Sound Director', '音響監督', 'audio', 50),
('Music Composer', '音楽', 'audio', 51),
('Sound Effects', '音響効果', 'audio', 52),
('Casting Director', 'キャスティング', 'audio', 53),

-- Post-Production Department
('Editor', '編集', 'post_production', 60),
('Finishing', '仕上げ', 'post_production', 61);

-- Create roles from departments (one role per department for simplicity)
INSERT INTO roles (department_id, name, name_ja, description, display_order)
SELECT id, name, name_ja, '', display_order FROM departments;

-- Seed role permissions based on the permission matrix

-- Executive Producer: L4 for all scopes, L5 for assignment and budget
INSERT INTO role_permissions (role_id, scope, level)
SELECT r.id, 'script', 4 FROM roles r WHERE r.name = 'Executive Producer'
UNION ALL
SELECT r.id, 'storyboard', 4 FROM roles r WHERE r.name = 'Executive Producer'
UNION ALL
SELECT r.id, 'animation', 4 FROM roles r WHERE r.name = 'Executive Producer'
UNION ALL
SELECT r.id, 'audio', 4 FROM roles r WHERE r.name = 'Executive Producer'
UNION ALL
SELECT r.id, 'editing', 4 FROM roles r WHERE r.name = 'Executive Producer'
UNION ALL
SELECT r.id, 'assignment', 5 FROM roles r WHERE r.name = 'Executive Producer'
UNION ALL
SELECT r.id, 'budget', 5 FROM roles r WHERE r.name = 'Executive Producer';

-- Producer: L4 for most, L5 for assignment, L4 for budget
INSERT INTO role_permissions (role_id, scope, level)
SELECT r.id, 'script', 4 FROM roles r WHERE r.name = 'Producer'
UNION ALL
SELECT r.id, 'storyboard', 4 FROM roles r WHERE r.name = 'Producer'
UNION ALL
SELECT r.id, 'animation', 4 FROM roles r WHERE r.name = 'Producer'
UNION ALL
SELECT r.id, 'audio', 4 FROM roles r WHERE r.name = 'Producer'
UNION ALL
SELECT r.id, 'editing', 4 FROM roles r WHERE r.name = 'Producer'
UNION ALL
SELECT r.id, 'assignment', 5 FROM roles r WHERE r.name = 'Producer'
UNION ALL
SELECT r.id, 'budget', 4 FROM roles r WHERE r.name = 'Producer';

-- Creative Director: L4 for all creative, L4 for assignment, L2 for budget
INSERT INTO role_permissions (role_id, scope, level)
SELECT r.id, 'script', 4 FROM roles r WHERE r.name = 'Creative Director'
UNION ALL
SELECT r.id, 'storyboard', 4 FROM roles r WHERE r.name = 'Creative Director'
UNION ALL
SELECT r.id, 'animation', 4 FROM roles r WHERE r.name = 'Creative Director'
UNION ALL
SELECT r.id, 'audio', 4 FROM roles r WHERE r.name = 'Creative Director'
UNION ALL
SELECT r.id, 'editing', 4 FROM roles r WHERE r.name = 'Creative Director'
UNION ALL
SELECT r.id, 'assignment', 4 FROM roles r WHERE r.name = 'Creative Director'
UNION ALL
SELECT r.id, 'budget', 2 FROM roles r WHERE r.name = 'Creative Director';

-- Director: L4 for creative, L3 for assignment, L1 for budget
INSERT INTO role_permissions (role_id, scope, level)
SELECT r.id, 'script', 4 FROM roles r WHERE r.name = 'Director'
UNION ALL
SELECT r.id, 'storyboard', 4 FROM roles r WHERE r.name = 'Director'
UNION ALL
SELECT r.id, 'animation', 4 FROM roles r WHERE r.name = 'Director'
UNION ALL
SELECT r.id, 'audio', 4 FROM roles r WHERE r.name = 'Director'
UNION ALL
SELECT r.id, 'editing', 4 FROM roles r WHERE r.name = 'Director'
UNION ALL
SELECT r.id, 'assignment', 3 FROM roles r WHERE r.name = 'Director'
UNION ALL
SELECT r.id, 'budget', 1 FROM roles r WHERE r.name = 'Director';

-- Chief Animation Director: L4 for animation, L3 for storyboard and assignment
INSERT INTO role_permissions (role_id, scope, level)
SELECT r.id, 'script', 1 FROM roles r WHERE r.name = 'Chief Animation Director'
UNION ALL
SELECT r.id, 'storyboard', 3 FROM roles r WHERE r.name = 'Chief Animation Director'
UNION ALL
SELECT r.id, 'animation', 4 FROM roles r WHERE r.name = 'Chief Animation Director'
UNION ALL
SELECT r.id, 'audio', 1 FROM roles r WHERE r.name = 'Chief Animation Director'
UNION ALL
SELECT r.id, 'editing', 1 FROM roles r WHERE r.name = 'Chief Animation Director'
UNION ALL
SELECT r.id, 'assignment', 3 FROM roles r WHERE r.name = 'Chief Animation Director'
UNION ALL
SELECT r.id, 'budget', 1 FROM roles r WHERE r.name = 'Chief Animation Director';

-- Sound Director: L4 for audio, L2 for editing, L3 for assignment
INSERT INTO role_permissions (role_id, scope, level)
SELECT r.id, 'script', 1 FROM roles r WHERE r.name = 'Sound Director'
UNION ALL
SELECT r.id, 'storyboard', 1 FROM roles r WHERE r.name = 'Sound Director'
UNION ALL
SELECT r.id, 'animation', 1 FROM roles r WHERE r.name = 'Sound Director'
UNION ALL
SELECT r.id, 'audio', 4 FROM roles r WHERE r.name = 'Sound Director'
UNION ALL
SELECT r.id, 'editing', 2 FROM roles r WHERE r.name = 'Sound Director'
UNION ALL
SELECT r.id, 'assignment', 3 FROM roles r WHERE r.name = 'Sound Director'
UNION ALL
SELECT r.id, 'budget', 1 FROM roles r WHERE r.name = 'Sound Director';

-- Series Composition: L4 for script, L3 for storyboard
INSERT INTO role_permissions (role_id, scope, level)
SELECT r.id, 'script', 4 FROM roles r WHERE r.name = 'Series Composition'
UNION ALL
SELECT r.id, 'storyboard', 3 FROM roles r WHERE r.name = 'Series Composition'
UNION ALL
SELECT r.id, 'animation', 1 FROM roles r WHERE r.name = 'Series Composition'
UNION ALL
SELECT r.id, 'audio', 1 FROM roles r WHERE r.name = 'Series Composition'
UNION ALL
SELECT r.id, 'editing', 1 FROM roles r WHERE r.name = 'Series Composition'
UNION ALL
SELECT r.id, 'assignment', 1 FROM roles r WHERE r.name = 'Series Composition'
UNION ALL
SELECT r.id, 'budget', 1 FROM roles r WHERE r.name = 'Series Composition';

-- Screenwriter: L2 for script
INSERT INTO role_permissions (role_id, scope, level)
SELECT r.id, 'script', 2 FROM roles r WHERE r.name = 'Screenwriter'
UNION ALL
SELECT r.id, 'storyboard', 1 FROM roles r WHERE r.name = 'Screenwriter'
UNION ALL
SELECT r.id, 'animation', 1 FROM roles r WHERE r.name = 'Screenwriter'
UNION ALL
SELECT r.id, 'audio', 1 FROM roles r WHERE r.name = 'Screenwriter'
UNION ALL
SELECT r.id, 'editing', 1 FROM roles r WHERE r.name = 'Screenwriter'
UNION ALL
SELECT r.id, 'assignment', 1 FROM roles r WHERE r.name = 'Screenwriter'
UNION ALL
SELECT r.id, 'budget', 1 FROM roles r WHERE r.name = 'Screenwriter';

-- Editor: L4 for editing, L2 for audio
INSERT INTO role_permissions (role_id, scope, level)
SELECT r.id, 'script', 1 FROM roles r WHERE r.name = 'Editor'
UNION ALL
SELECT r.id, 'storyboard', 1 FROM roles r WHERE r.name = 'Editor'
UNION ALL
SELECT r.id, 'animation', 1 FROM roles r WHERE r.name = 'Editor'
UNION ALL
SELECT r.id, 'audio', 2 FROM roles r WHERE r.name = 'Editor'
UNION ALL
SELECT r.id, 'editing', 4 FROM roles r WHERE r.name = 'Editor'
UNION ALL
SELECT r.id, 'assignment', 1 FROM roles r WHERE r.name = 'Editor'
UNION ALL
SELECT r.id, 'budget', 1 FROM roles r WHERE r.name = 'Editor';

-- Translator: L2 for script
INSERT INTO role_permissions (role_id, scope, level)
SELECT r.id, 'script', 2 FROM roles r WHERE r.name = 'Translator'
UNION ALL
SELECT r.id, 'storyboard', 1 FROM roles r WHERE r.name = 'Translator'
UNION ALL
SELECT r.id, 'animation', 1 FROM roles r WHERE r.name = 'Translator'
UNION ALL
SELECT r.id, 'audio', 1 FROM roles r WHERE r.name = 'Translator'
UNION ALL
SELECT r.id, 'editing', 1 FROM roles r WHERE r.name = 'Translator'
UNION ALL
SELECT r.id, 'assignment', 1 FROM roles r WHERE r.name = 'Translator'
UNION ALL
SELECT r.id, 'budget', 1 FROM roles r WHERE r.name = 'Translator';

-- Default L1 permissions for remaining roles
INSERT INTO role_permissions (role_id, scope, level)
SELECT r.id, s.scope, 1
FROM roles r
CROSS JOIN (
    VALUES ('script'), ('storyboard'), ('animation'), ('audio'), ('editing'), ('assignment'), ('budget')
) AS s(scope)
WHERE r.name NOT IN (
    'Executive Producer', 'Producer', 'Creative Director', 'Director', 
    'Chief Animation Director', 'Sound Director', 
    'Series Composition', 'Screenwriter', 'Editor', 'Translator'
)
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.scope = s.scope
);
