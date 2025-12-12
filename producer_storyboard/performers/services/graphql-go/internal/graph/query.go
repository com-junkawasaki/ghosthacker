package graph

import (
	"context"
	"encoding/base64"
	"time"

	"github.com/google/uuid"
	"github.com/graphql-go/graphql"
	"github.com/jackc/pgx/v5"

	"github.com/gftd/producer-storyboard/performers/services/graphql-go/internal/auth"
)

// Query field resolvers

func (r *Resolver) healthField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.String,
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			return "ok", nil
		},
	}
}

func (r *Resolver) projectsField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.NewList(ProjectType),
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			clerkAuth := auth.GetAuthFromContext(ctx)

			var rows pgx.Rows
			var err error

			if clerkAuth.OrgID != "" {
				rows, err = r.pool.Query(ctx, `
					SELECT id, title, description, created_at, updated_at
					FROM storyboard_projects
					WHERE org_id = $1
					ORDER BY created_at DESC
				`, clerkAuth.OrgID)
			} else {
				rows, err = r.pool.Query(ctx, `
					SELECT id, title, description, created_at, updated_at
					FROM storyboard_projects
					ORDER BY created_at DESC
				`)
			}
			if err != nil {
				return nil, err
			}
			defer rows.Close()

			var projects []map[string]interface{}
			for rows.Next() {
				var id uuid.UUID
				var title string
				var description *string
				var createdAt, updatedAt time.Time

				if err := rows.Scan(&id, &title, &description, &createdAt, &updatedAt); err != nil {
					return nil, err
				}

				projects = append(projects, map[string]interface{}{
					"id":          id.String(),
					"title":       title,
					"description": description,
					"createdAt":   createdAt.Format(time.RFC3339),
					"updatedAt":   updatedAt.Format(time.RFC3339),
				})
			}

			return projects, nil
		},
	}
}

func (r *Resolver) storyboardsField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.NewList(StoryboardType),
		Args: graphql.FieldConfigArgument{
			"projectId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			projectID := p.Args["projectId"].(string)

			projectUUID, err := uuid.Parse(projectID)
			if err != nil {
				return nil, err
			}

			rows, err := r.pool.Query(ctx, `
				SELECT id, project_id, title, aspect_ratio, resolution, duration_seconds, num_variations, created_at, updated_at
				FROM storyboards
				WHERE project_id = $1
				ORDER BY created_at DESC
			`, projectUUID)
			if err != nil {
				return nil, err
			}
			defer rows.Close()

			var storyboards []map[string]interface{}
			for rows.Next() {
				var id, pID uuid.UUID
				var title, aspectRatio, resolution string
				var durationSeconds *int32
				var numVariations int32
				var createdAt, updatedAt time.Time

				if err := rows.Scan(&id, &pID, &title, &aspectRatio, &resolution, &durationSeconds, &numVariations, &createdAt, &updatedAt); err != nil {
					return nil, err
				}

				storyboards = append(storyboards, map[string]interface{}{
					"id":              id.String(),
					"projectId":       pID.String(),
					"title":           title,
					"aspectRatio":     aspectRatio,
					"resolution":      resolution,
					"durationSeconds": durationSeconds,
					"numVariations":   numVariations,
					"createdAt":       createdAt.Format(time.RFC3339),
					"updatedAt":       updatedAt.Format(time.RFC3339),
				})
			}

			return storyboards, nil
		},
	}
}

func (r *Resolver) scenesField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.NewList(SceneType),
		Args: graphql.FieldConfigArgument{
			"storyboardId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			storyboardID := p.Args["storyboardId"].(string)

			storyboardUUID, err := uuid.Parse(storyboardID)
			if err != nil {
				return nil, err
			}

			rows, err := r.pool.Query(ctx, `
				SELECT id, storyboard_id, scene_number, text_description, media_type, media_url,
				       start_time_seconds, duration_seconds, transition_type, created_at, updated_at
				FROM scenes
				WHERE storyboard_id = $1
				ORDER BY scene_number ASC
			`, storyboardUUID)
			if err != nil {
				return nil, err
			}
			defer rows.Close()

			var scenes []map[string]interface{}
			for rows.Next() {
				var id, sbID uuid.UUID
				var sceneNumber int32
				var textDescription, mediaType, mediaUrl, transitionType *string
				var startTimeSeconds, durationSeconds *float64
				var createdAt, updatedAt time.Time

				if err := rows.Scan(&id, &sbID, &sceneNumber, &textDescription, &mediaType, &mediaUrl, &startTimeSeconds, &durationSeconds, &transitionType, &createdAt, &updatedAt); err != nil {
					return nil, err
				}

				scenes = append(scenes, map[string]interface{}{
					"id":               id.String(),
					"storyboardId":     sbID.String(),
					"sceneNumber":      sceneNumber,
					"textDescription":  textDescription,
					"mediaType":        mediaType,
					"mediaUrl":         mediaUrl,
					"startTimeSeconds": startTimeSeconds,
					"durationSeconds":  durationSeconds,
					"transitionType":   transitionType,
					"createdAt":        createdAt.Format(time.RFC3339),
					"updatedAt":        updatedAt.Format(time.RFC3339),
				})
			}

			return scenes, nil
		},
	}
}

func (r *Resolver) sceneField() *graphql.Field {
	return &graphql.Field{
		Type: SceneType,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			sceneID := p.Args["id"].(string)

			sceneUUID, err := uuid.Parse(sceneID)
			if err != nil {
				return nil, err
			}

			var id, sbID uuid.UUID
			var sceneNumber int32
			var textDescription, mediaType, mediaUrl, transitionType *string
			var startTimeSeconds, durationSeconds *float64
			var createdAt, updatedAt time.Time

			err = r.pool.QueryRow(ctx, `
				SELECT id, storyboard_id, scene_number, text_description, media_type, media_url,
				       start_time_seconds, duration_seconds, transition_type, created_at, updated_at
				FROM scenes
				WHERE id = $1
			`, sceneUUID).Scan(&id, &sbID, &sceneNumber, &textDescription, &mediaType, &mediaUrl, &startTimeSeconds, &durationSeconds, &transitionType, &createdAt, &updatedAt)
			if err == pgx.ErrNoRows {
				return nil, nil
			}
			if err != nil {
				return nil, err
			}

			return map[string]interface{}{
				"id":               id.String(),
				"storyboardId":     sbID.String(),
				"sceneNumber":      sceneNumber,
				"textDescription":  textDescription,
				"mediaType":        mediaType,
				"mediaUrl":         mediaUrl,
				"startTimeSeconds": startTimeSeconds,
				"durationSeconds":  durationSeconds,
				"transitionType":   transitionType,
				"createdAt":        createdAt.Format(time.RFC3339),
				"updatedAt":        updatedAt.Format(time.RFC3339),
			}, nil
		},
	}
}

func (r *Resolver) generatedVideosField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.NewList(VideoStatusType),
		Args: graphql.FieldConfigArgument{
			"storyboardId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			storyboardID := p.Args["storyboardId"].(string)

			storyboardUUID, err := uuid.Parse(storyboardID)
			if err != nil {
				return nil, err
			}

			rows, err := r.pool.Query(ctx, `
				SELECT id, storyboard_id, variation_number, video_url, status, error_message, created_at
				FROM generated_videos
				WHERE storyboard_id = $1
				ORDER BY variation_number ASC, created_at DESC
			`, storyboardUUID)
			if err != nil {
				return nil, err
			}
			defer rows.Close()

			var videos []map[string]interface{}
			for rows.Next() {
				var id, sbID uuid.UUID
				var variationNumber int32
				var videoUrl, status, errorMessage *string
				var createdAt time.Time

				if err := rows.Scan(&id, &sbID, &variationNumber, &videoUrl, &status, &errorMessage, &createdAt); err != nil {
					return nil, err
				}

				videos = append(videos, map[string]interface{}{
					"id":              id.String(),
					"storyboardId":    sbID.String(),
					"variationNumber": variationNumber,
					"videoUrl":        videoUrl,
					"status":          status,
					"errorMessage":    errorMessage,
					"createdAt":       createdAt.Format(time.RFC3339),
				})
			}

			return videos, nil
		},
	}
}

func (r *Resolver) generatedImagesField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.NewList(GeneratedImageType),
		Args: graphql.FieldConfigArgument{
			"sceneId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			sceneID := p.Args["sceneId"].(string)

			sceneUUID, err := uuid.Parse(sceneID)
			if err != nil {
				return nil, err
			}

			rows, err := r.pool.Query(ctx, `
				SELECT id, scene_id, openai_image_id, image_format, image_type, prompt, model, created_at
				FROM generated_images
				WHERE scene_id = $1
				ORDER BY created_at DESC
			`, sceneUUID)
			if err != nil {
				return nil, err
			}
			defer rows.Close()

			var images []map[string]interface{}
			for rows.Next() {
				var id, sID uuid.UUID
				var openaiImageId, imageFormat, imageType, prompt, model *string
				var createdAt time.Time

				if err := rows.Scan(&id, &sID, &openaiImageId, &imageFormat, &imageType, &prompt, &model, &createdAt); err != nil {
					return nil, err
				}

				images = append(images, map[string]interface{}{
					"id":            id.String(),
					"sceneId":       sID.String(),
					"openaiImageId": openaiImageId,
					"imageFormat":   imageFormat,
					"imageType":     imageType,
					"prompt":        prompt,
					"model":         model,
					"createdAt":     createdAt.Format(time.RFC3339),
				})
			}

			return images, nil
		},
	}
}

func (r *Resolver) imageDataField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.String,
		Args: graphql.FieldConfigArgument{
			"imageId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			imageID := p.Args["imageId"].(string)

			imageUUID, err := uuid.Parse(imageID)
			if err != nil {
				return nil, err
			}

			var imageData []byte
			err = r.pool.QueryRow(ctx, `
				SELECT image_data FROM generated_images WHERE id = $1
			`, imageUUID).Scan(&imageData)
			if err != nil {
				return nil, err
			}

			return base64.StdEncoding.EncodeToString(imageData), nil
		},
	}
}

func (r *Resolver) charactersField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.NewList(CharacterType),
		Args: graphql.FieldConfigArgument{
			"projectId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			projectID := p.Args["projectId"].(string)

			projectUUID, err := uuid.Parse(projectID)
			if err != nil {
				return nil, err
			}

			rows, err := r.pool.Query(ctx, `
				SELECT id, project_id, name, description, personality, background, default_hume_voice_id, profile_image_id, created_at, updated_at
				FROM characters
				WHERE project_id = $1
				ORDER BY created_at ASC
			`, projectUUID)
			if err != nil {
				return nil, err
			}
			defer rows.Close()

			var characters []map[string]interface{}
			for rows.Next() {
				var id, pID uuid.UUID
				var profileImageId *uuid.UUID
				var name string
				var description, personality, background, defaultHumeVoiceId *string
				var createdAt, updatedAt time.Time

				if err := rows.Scan(&id, &pID, &name, &description, &personality, &background, &defaultHumeVoiceId, &profileImageId, &createdAt, &updatedAt); err != nil {
					return nil, err
				}

				char := map[string]interface{}{
					"id":                 id.String(),
					"projectId":          pID.String(),
					"name":               name,
					"description":        description,
					"personality":        personality,
					"background":         background,
					"defaultHumeVoiceId": defaultHumeVoiceId,
					"createdAt":          createdAt.Format(time.RFC3339),
					"updatedAt":          updatedAt.Format(time.RFC3339),
				}
				if profileImageId != nil {
					char["profileImageId"] = profileImageId.String()
				}
				characters = append(characters, char)
			}

			return characters, nil
		},
	}
}

func (r *Resolver) dialoguesField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.NewList(DialogueType),
		Args: graphql.FieldConfigArgument{
			"sceneId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			sceneID := p.Args["sceneId"].(string)

			sceneUUID, err := uuid.Parse(sceneID)
			if err != nil {
				return nil, err
			}

			rows, err := r.pool.Query(ctx, `
				SELECT id, scene_id, character_id, language, text, translated_text, hume_voice_id, audio_url,
				       start_time_seconds, duration_seconds, order_index, created_at, updated_at
				FROM dialogues
				WHERE scene_id = $1
				ORDER BY order_index ASC, created_at ASC
			`, sceneUUID)
			if err != nil {
				return nil, err
			}
			defer rows.Close()

			var dialogues []map[string]interface{}
			for rows.Next() {
				var id, sID, charID uuid.UUID
				var language, text string
				var translatedText, humeVoiceId, audioUrl *string
				var startTimeSeconds, durationSeconds *float64
				var orderIndex int32
				var createdAt, updatedAt time.Time

				if err := rows.Scan(&id, &sID, &charID, &language, &text, &translatedText, &humeVoiceId, &audioUrl, &startTimeSeconds, &durationSeconds, &orderIndex, &createdAt, &updatedAt); err != nil {
					return nil, err
				}

				dialogues = append(dialogues, map[string]interface{}{
					"id":               id.String(),
					"sceneId":          sID.String(),
					"characterId":      charID.String(),
					"language":         language,
					"text":             text,
					"translatedText":   translatedText,
					"humeVoiceId":      humeVoiceId,
					"audioUrl":         audioUrl,
					"startTimeSeconds": startTimeSeconds,
					"durationSeconds":  durationSeconds,
					"orderIndex":       orderIndex,
					"createdAt":        createdAt.Format(time.RFC3339),
					"updatedAt":        updatedAt.Format(time.RFC3339),
				})
			}

			return dialogues, nil
		},
	}
}

func (r *Resolver) humeVoicesField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.NewList(HumeVoiceType),
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			// This will call the Hume service to list voices
			// For now, return empty list - will be implemented in services
			return []map[string]interface{}{}, nil
		},
	}
}

func (r *Resolver) audioDataField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.String,
		Args: graphql.FieldConfigArgument{
			"dialogueId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			dialogueID := p.Args["dialogueId"].(string)

			dialogueUUID, err := uuid.Parse(dialogueID)
			if err != nil {
				return nil, err
			}

			var audioData []byte
			err = r.pool.QueryRow(ctx, `
				SELECT audio_data FROM dialogues WHERE id = $1 AND audio_data IS NOT NULL
			`, dialogueUUID).Scan(&audioData)
			if err != nil {
				return nil, err
			}

			return base64.StdEncoding.EncodeToString(audioData), nil
		},
	}
}

func (r *Resolver) characterAssetsField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.NewList(CharacterAssetType),
		Args: graphql.FieldConfigArgument{
			"characterId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			characterID := p.Args["characterId"].(string)

			characterUUID, err := uuid.Parse(characterID)
			if err != nil {
				return nil, err
			}

			rows, err := r.pool.Query(ctx, `
				SELECT id, character_id, asset_type, asset_format, created_at, updated_at
				FROM character_assets
				WHERE character_id = $1
				ORDER BY created_at DESC
			`, characterUUID)
			if err != nil {
				return nil, err
			}
			defer rows.Close()

			var assets []map[string]interface{}
			for rows.Next() {
				var id, cID uuid.UUID
				var assetType string
				var assetFormat *string
				var createdAt, updatedAt time.Time

				if err := rows.Scan(&id, &cID, &assetType, &assetFormat, &createdAt, &updatedAt); err != nil {
					return nil, err
				}

				assets = append(assets, map[string]interface{}{
					"id":          id.String(),
					"characterId": cID.String(),
					"assetType":   assetType,
					"assetFormat": assetFormat,
					"createdAt":   createdAt.Format(time.RFC3339),
					"updatedAt":   updatedAt.Format(time.RFC3339),
				})
			}

			return assets, nil
		},
	}
}

func (r *Resolver) characterAssetDataField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.String,
		Args: graphql.FieldConfigArgument{
			"assetId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			assetID := p.Args["assetId"].(string)

			assetUUID, err := uuid.Parse(assetID)
			if err != nil {
				return nil, err
			}

			var assetData []byte
			err = r.pool.QueryRow(ctx, `
				SELECT asset_data FROM character_assets WHERE id = $1
			`, assetUUID).Scan(&assetData)
			if err != nil {
				return nil, err
			}

			return base64.StdEncoding.EncodeToString(assetData), nil
		},
	}
}

func (r *Resolver) operationHistoryField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.NewList(OperationHistoryType),
		Args: graphql.FieldConfigArgument{
			"entityType": &graphql.ArgumentConfig{Type: graphql.String},
			"entityId":   &graphql.ArgumentConfig{Type: graphql.ID},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			entityType, _ := p.Args["entityType"].(string)
			entityID, _ := p.Args["entityId"].(string)

			var rows pgx.Rows
			var err error

			if entityID != "" {
				entityUUID, err := uuid.Parse(entityID)
				if err != nil {
					return nil, err
				}
				rows, err = r.pool.Query(ctx, `
					SELECT id, entity_type, entity_id, operation_type, operation_data, user_id, created_at
					FROM operation_history
					WHERE entity_id = $1 AND ($2::text IS NULL OR entity_type = $2)
					ORDER BY created_at DESC
					LIMIT 100
				`, entityUUID, nullIfEmpty(entityType))
			} else if entityType != "" {
				rows, err = r.pool.Query(ctx, `
					SELECT id, entity_type, entity_id, operation_type, operation_data, user_id, created_at
					FROM operation_history
					WHERE entity_type = $1
					ORDER BY created_at DESC
					LIMIT 100
				`, entityType)
			} else {
				rows, err = r.pool.Query(ctx, `
					SELECT id, entity_type, entity_id, operation_type, operation_data, user_id, created_at
					FROM operation_history
					ORDER BY created_at DESC
					LIMIT 100
				`)
			}
			if err != nil {
				return nil, err
			}
			defer rows.Close()

			var history []map[string]interface{}
			for rows.Next() {
				var id, eID uuid.UUID
				var userID *uuid.UUID
				var eType, opType, opData string
				var createdAt time.Time

				if err := rows.Scan(&id, &eType, &eID, &opType, &opData, &userID, &createdAt); err != nil {
					return nil, err
				}

				h := map[string]interface{}{
					"id":            id.String(),
					"entityType":    eType,
					"entityId":      eID.String(),
					"operationType": opType,
					"operationData": opData,
					"createdAt":     createdAt.Format(time.RFC3339),
				}
				if userID != nil {
					h["userId"] = userID.String()
				}
				history = append(history, h)
			}

			return history, nil
		},
	}
}

func (r *Resolver) composersField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.NewList(ComposerType),
		Args: graphql.FieldConfigArgument{
			"projectId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			projectID := p.Args["projectId"].(string)

			projectUUID, err := uuid.Parse(projectID)
			if err != nil {
				return nil, err
			}

			rows, err := r.pool.Query(ctx, `
				SELECT id, project_id, title, duration_seconds, created_at, updated_at
				FROM composers
				WHERE project_id = $1
				ORDER BY created_at DESC
			`, projectUUID)
			if err != nil {
				return nil, err
			}
			defer rows.Close()

			var composers []map[string]interface{}
			for rows.Next() {
				var id, pID uuid.UUID
				var title string
				var durationSeconds *float64
				var createdAt, updatedAt time.Time

				if err := rows.Scan(&id, &pID, &title, &durationSeconds, &createdAt, &updatedAt); err != nil {
					return nil, err
				}

				composers = append(composers, map[string]interface{}{
					"id":              id.String(),
					"projectId":       pID.String(),
					"title":           title,
					"durationSeconds": durationSeconds,
					"createdAt":       createdAt.Format(time.RFC3339),
					"updatedAt":       updatedAt.Format(time.RFC3339),
				})
			}

			return composers, nil
		},
	}
}

func (r *Resolver) composerField() *graphql.Field {
	return &graphql.Field{
		Type: ComposerType,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			composerID := p.Args["id"].(string)

			composerUUID, err := uuid.Parse(composerID)
			if err != nil {
				return nil, err
			}

			var id, pID uuid.UUID
			var title string
			var durationSeconds *float64
			var createdAt, updatedAt time.Time

			err = r.pool.QueryRow(ctx, `
				SELECT id, project_id, title, duration_seconds, created_at, updated_at
				FROM composers
				WHERE id = $1
			`, composerUUID).Scan(&id, &pID, &title, &durationSeconds, &createdAt, &updatedAt)
			if err == pgx.ErrNoRows {
				return nil, nil
			}
			if err != nil {
				return nil, err
			}

			return map[string]interface{}{
				"id":              id.String(),
				"projectId":       pID.String(),
				"title":           title,
				"durationSeconds": durationSeconds,
				"createdAt":       createdAt.Format(time.RFC3339),
				"updatedAt":       updatedAt.Format(time.RFC3339),
			}, nil
		},
	}
}

func (r *Resolver) audioTracksField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.NewList(AudioTrackType),
		Args: graphql.FieldConfigArgument{
			"composerId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			composerID := p.Args["composerId"].(string)

			composerUUID, err := uuid.Parse(composerID)
			if err != nil {
				return nil, err
			}

			rows, err := r.pool.Query(ctx, `
				SELECT id, composer_id, track_number, track_type, name, created_at, updated_at
				FROM audio_tracks
				WHERE composer_id = $1
				ORDER BY track_number ASC
			`, composerUUID)
			if err != nil {
				return nil, err
			}
			defer rows.Close()

			var tracks []map[string]interface{}
			for rows.Next() {
				var id, cID uuid.UUID
				var trackNumber int32
				var trackType string
				var name *string
				var createdAt, updatedAt time.Time

				if err := rows.Scan(&id, &cID, &trackNumber, &trackType, &name, &createdAt, &updatedAt); err != nil {
					return nil, err
				}

				tracks = append(tracks, map[string]interface{}{
					"id":          id.String(),
					"composerId":  cID.String(),
					"trackNumber": trackNumber,
					"trackType":   trackType,
					"name":        name,
					"createdAt":   createdAt.Format(time.RFC3339),
					"updatedAt":   updatedAt.Format(time.RFC3339),
				})
			}

			return tracks, nil
		},
	}
}

func (r *Resolver) audioClipsField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.NewList(AudioClipType),
		Args: graphql.FieldConfigArgument{
			"trackId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			trackID := p.Args["trackId"].(string)

			trackUUID, err := uuid.Parse(trackID)
			if err != nil {
				return nil, err
			}

			rows, err := r.pool.Query(ctx, `
				SELECT id, track_id, start_time_seconds, duration_seconds, audio_type, audio_url, audio_data_id, metadata, created_at, updated_at
				FROM audio_clips
				WHERE track_id = $1
				ORDER BY start_time_seconds ASC
			`, trackUUID)
			if err != nil {
				return nil, err
			}
			defer rows.Close()

			var clips []map[string]interface{}
			for rows.Next() {
				var id, tID uuid.UUID
				var audioDataId *uuid.UUID
				var startTimeSeconds, durationSeconds float64
				var audioType string
				var audioUrl, metadata *string
				var createdAt, updatedAt time.Time

				if err := rows.Scan(&id, &tID, &startTimeSeconds, &durationSeconds, &audioType, &audioUrl, &audioDataId, &metadata, &createdAt, &updatedAt); err != nil {
					return nil, err
				}

				clip := map[string]interface{}{
					"id":               id.String(),
					"trackId":          tID.String(),
					"startTimeSeconds": startTimeSeconds,
					"durationSeconds":  durationSeconds,
					"audioType":        audioType,
					"audioUrl":         audioUrl,
					"metadata":         metadata,
					"createdAt":        createdAt.Format(time.RFC3339),
					"updatedAt":        updatedAt.Format(time.RFC3339),
				}
				if audioDataId != nil {
					clip["audioDataId"] = audioDataId.String()
				}
				clips = append(clips, clip)
			}

			return clips, nil
		},
	}
}

func (r *Resolver) sunoMusicField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.NewList(SunoMusicType),
		Args: graphql.FieldConfigArgument{
			"composerId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			composerID := p.Args["composerId"].(string)

			composerUUID, err := uuid.Parse(composerID)
			if err != nil {
				return nil, err
			}

			rows, err := r.pool.Query(ctx, `
				SELECT id, composer_id, prompt, status, audio_url, audio_data_id, task_id, created_at, updated_at
				FROM suno_music
				WHERE composer_id = $1
				ORDER BY created_at DESC
			`, composerUUID)
			if err != nil {
				return nil, err
			}
			defer rows.Close()

			var music []map[string]interface{}
			for rows.Next() {
				var id uuid.UUID
				var cID, audioDataId *uuid.UUID
				var prompt, status string
				var audioUrl, taskId *string
				var createdAt, updatedAt time.Time

				if err := rows.Scan(&id, &cID, &prompt, &status, &audioUrl, &audioDataId, &taskId, &createdAt, &updatedAt); err != nil {
					return nil, err
				}

				m := map[string]interface{}{
					"id":        id.String(),
					"prompt":    prompt,
					"status":    status,
					"audioUrl":  audioUrl,
					"taskId":    taskId,
					"createdAt": createdAt.Format(time.RFC3339),
					"updatedAt": updatedAt.Format(time.RFC3339),
				}
				if cID != nil {
					m["composerId"] = cID.String()
				}
				if audioDataId != nil {
					m["audioDataId"] = audioDataId.String()
				}
				music = append(music, m)
			}

			return music, nil
		},
	}
}

func (r *Resolver) scenariosField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.NewList(ScenarioType),
		Args: graphql.FieldConfigArgument{
			"projectId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			projectID := p.Args["projectId"].(string)

			projectUUID, err := uuid.Parse(projectID)
			if err != nil {
				return nil, err
			}

			rows, err := r.pool.Query(ctx, `
				SELECT id, project_id, title, description, created_at, updated_at
				FROM scenarios
				WHERE project_id = $1
				ORDER BY created_at DESC
			`, projectUUID)
			if err != nil {
				return nil, err
			}
			defer rows.Close()

			var scenarios []map[string]interface{}
			for rows.Next() {
				var id, pID uuid.UUID
				var title string
				var description *string
				var createdAt, updatedAt time.Time

				if err := rows.Scan(&id, &pID, &title, &description, &createdAt, &updatedAt); err != nil {
					return nil, err
				}

				scenarios = append(scenarios, map[string]interface{}{
					"id":          id.String(),
					"projectId":   pID.String(),
					"title":       title,
					"description": description,
					"createdAt":   createdAt.Format(time.RFC3339),
					"updatedAt":   updatedAt.Format(time.RFC3339),
				})
			}

			return scenarios, nil
		},
	}
}

func (r *Resolver) scenarioField() *graphql.Field {
	return &graphql.Field{
		Type: ScenarioType,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			scenarioID := p.Args["id"].(string)

			scenarioUUID, err := uuid.Parse(scenarioID)
			if err != nil {
				return nil, err
			}

			var id, pID uuid.UUID
			var title string
			var description *string
			var createdAt, updatedAt time.Time

			err = r.pool.QueryRow(ctx, `
				SELECT id, project_id, title, description, created_at, updated_at
				FROM scenarios
				WHERE id = $1
			`, scenarioUUID).Scan(&id, &pID, &title, &description, &createdAt, &updatedAt)
			if err == pgx.ErrNoRows {
				return nil, nil
			}
			if err != nil {
				return nil, err
			}

			return map[string]interface{}{
				"id":          id.String(),
				"projectId":   pID.String(),
				"title":       title,
				"description": description,
				"createdAt":   createdAt.Format(time.RFC3339),
				"updatedAt":   updatedAt.Format(time.RFC3339),
			}, nil
		},
	}
}

// Helper function
func nullIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// Prevent import error
var _ = context.Background
