// @context https://schema.org/DatabaseSchema
// @type {gh:DieselSchema}
// Merkle DAG: diesel-schema -> diesel-orm -> postgres
// Database schema definitions using Diesel ORM for Supabase PostgreSQL
// Generated from Drizzle schema: producer/src/infra/supabase/schema.ts

diesel::table! {
    projects (id) {
        id -> Uuid,
        title -> Text,
        logline -> Text,
        genres -> Jsonb,
        tone -> Varchar,
        audience_rating -> Varchar,
        language -> Varchar,
        keywords -> Jsonb,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    narratives (id) {
        id -> Uuid,
        project_id -> Uuid,
        synopsis -> Text,
        structure -> Varchar,
        beats -> Jsonb,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    characters (id) {
        id -> Uuid,
        project_id -> Uuid,
        name -> Text,
        role -> Varchar,
        motivation -> Nullable<Text>,
        conflict -> Nullable<Text>,
        voice -> Nullable<Varchar>,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    backstories (id) {
        id -> Uuid,
        project_id -> Uuid,
        character_id -> Nullable<Uuid>,
        origin -> Text,
        motivation -> Nullable<Text>,
        conflict -> Nullable<Text>,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    episodes (id) {
        id -> Uuid,
        project_id -> Uuid,
        episode_id -> Text,
        name -> Text,
        episode_number -> Varchar,
        source_path -> Nullable<Text>,
        has_part -> Nullable<Jsonb>,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    styles (id) {
        id -> Uuid,
        project_id -> Uuid,
        visual -> Jsonb,
        audio -> Jsonb,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    platforms (id) {
        id -> Uuid,
        project_id -> Uuid,
        wattpad -> Jsonb,
        webtoon -> Jsonb,
        youtube -> Jsonb,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    canvas (id) {
        id -> Uuid,
        project_id -> Uuid,
        config -> Jsonb,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    pipeline_nodes (id) {
        id -> Text,
        node_type -> Varchar,
        label -> Text,
        config_json -> Jsonb,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    artifacts (id) {
        id -> Uuid,
        node_id -> Text,
        node_type -> Varchar,
        label -> Nullable<Text>,
        payload_json -> Jsonb,
        created_at -> Timestamp,
    }
}

diesel::joinable!(narratives -> projects (project_id));
diesel::joinable!(characters -> projects (project_id));
diesel::joinable!(backstories -> projects (project_id));
diesel::joinable!(backstories -> characters (character_id));
diesel::joinable!(episodes -> projects (project_id));
diesel::joinable!(styles -> projects (project_id));
diesel::joinable!(platforms -> projects (project_id));
diesel::joinable!(canvas -> projects (project_id));
diesel::joinable!(artifacts -> pipeline_nodes (node_id));

diesel::allow_tables_to_appear_in_same_query!(
    projects,
    narratives,
    characters,
    backstories,
    episodes,
    styles,
    platforms,
    canvas,
    pipeline_nodes,
    artifacts,
);

