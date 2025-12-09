-- Seed sample data for development and testing

-- Sample Project
INSERT INTO storyboard_projects (id, title, description, created_at, updated_at)
VALUES (
    '5e6c7387-ae70-4c0e-96f3-8110f2fd28a5',
    'Sample Project',
    'A sample project for testing the storyboard editor',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, updated_at = NOW();

-- Sample Storyboard
INSERT INTO storyboards (id, project_id, title, aspect_ratio, resolution, duration_seconds, num_variations, created_at, updated_at)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    '5e6c7387-ae70-4c0e-96f3-8110f2fd28a5',
    'Sample Storyboard',
    '16:9',
    '1920x1080',
    5,
    1,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, updated_at = NOW();

-- Delete existing scenes for this storyboard to avoid conflicts
DELETE FROM scenes WHERE storyboard_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- Sample Scenes
INSERT INTO scenes (id, storyboard_id, scene_number, text_description, start_time_seconds, duration_seconds, transition_type, created_at, updated_at)
VALUES
    (
        gen_random_uuid(),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        1,
        'Wide-angle view of a city street. Pleasant blue sky and birds flying. Street is filled with trees and morning joggers and bike riders.',
        0.00,
        2.12,
        'cut',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        2,
        'Cut to a close-up of a person walking on the same street. Person wearing a blue t-shirt and the sky is still blue and pleasant with birds.',
        2.12,
        1.14,
        'cut',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        3,
        'Sky turns dark all of the sudden and it starts raining. The person becomes wet but still proceeds to walk casually.',
        3.26,
        1.74,
        'fade',
        NOW(),
        NOW()
    );

