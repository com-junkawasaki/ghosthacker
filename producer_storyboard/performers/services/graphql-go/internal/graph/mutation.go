package graph

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/graphql-go/graphql"
	"github.com/jackc/pgx/v5"

	"github.com/gftd/producer-storyboard/performers/services/graphql-go/internal/auth"
)

// Mutation field resolvers

func (r *Resolver) createProjectField() *graphql.Field {
	return &graphql.Field{
		Type: ProjectType,
		Args: graphql.FieldConfigArgument{
			"title":       &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"description": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			clerkAuth := auth.GetAuthFromContext(ctx)

			title := p.Args["title"].(string)
			description, _ := p.Args["description"].(string)

			var id uuid.UUID
			var createdAt, updatedAt time.Time
			var desc *string

			err := r.pool.QueryRow(ctx, `
				INSERT INTO storyboard_projects (title, description, org_id)
				VALUES ($1, $2, $3)
				RETURNING id, title, description, created_at, updated_at
			`, title, nullIfEmpty(description), nullIfEmpty(clerkAuth.OrgID)).Scan(&id, &title, &desc, &createdAt, &updatedAt)
			if err != nil {
				return nil, err
			}

			return map[string]interface{}{
				"id":          id.String(),
				"title":       title,
				"description": desc,
				"createdAt":   createdAt.Format(time.RFC3339),
				"updatedAt":   updatedAt.Format(time.RFC3339),
			}, nil
		},
	}
}

func (r *Resolver) updateProjectField() *graphql.Field {
	return &graphql.Field{
		Type: ProjectType,
		Args: graphql.FieldConfigArgument{
			"id":          &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"title":       &graphql.ArgumentConfig{Type: graphql.String},
			"description": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			projectID := p.Args["id"].(string)
			title, hasTitle := p.Args["title"].(string)
			description, hasDesc := p.Args["description"].(string)

			projectUUID, err := uuid.Parse(projectID)
			if err != nil {
				return nil, err
			}

			var id uuid.UUID
			var updatedTitle string
			var desc *string
			var createdAt, updatedAt time.Time

			if hasTitle && hasDesc {
				err = r.pool.QueryRow(ctx, `
					UPDATE storyboard_projects SET title = $1, description = $2, updated_at = NOW()
					WHERE id = $3
					RETURNING id, title, description, created_at, updated_at
				`, title, nullIfEmpty(description), projectUUID).Scan(&id, &updatedTitle, &desc, &createdAt, &updatedAt)
			} else if hasTitle {
				err = r.pool.QueryRow(ctx, `
					UPDATE storyboard_projects SET title = $1, updated_at = NOW()
					WHERE id = $2
					RETURNING id, title, description, created_at, updated_at
				`, title, projectUUID).Scan(&id, &updatedTitle, &desc, &createdAt, &updatedAt)
			} else if hasDesc {
				err = r.pool.QueryRow(ctx, `
					UPDATE storyboard_projects SET description = $1, updated_at = NOW()
					WHERE id = $2
					RETURNING id, title, description, created_at, updated_at
				`, nullIfEmpty(description), projectUUID).Scan(&id, &updatedTitle, &desc, &createdAt, &updatedAt)
			} else {
				err = r.pool.QueryRow(ctx, `
					SELECT id, title, description, created_at, updated_at
					FROM storyboard_projects WHERE id = $1
				`, projectUUID).Scan(&id, &updatedTitle, &desc, &createdAt, &updatedAt)
			}

			if err == pgx.ErrNoRows {
				return nil, errors.New("project not found")
			}
			if err != nil {
				return nil, err
			}

			return map[string]interface{}{
				"id":          id.String(),
				"title":       updatedTitle,
				"description": desc,
				"createdAt":   createdAt.Format(time.RFC3339),
				"updatedAt":   updatedAt.Format(time.RFC3339),
			}, nil
		},
	}
}

func (r *Resolver) deleteProjectField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			projectID := p.Args["id"].(string)

			projectUUID, err := uuid.Parse(projectID)
			if err != nil {
				return false, err
			}

			result, err := r.pool.Exec(ctx, `DELETE FROM storyboard_projects WHERE id = $1`, projectUUID)
			if err != nil {
				return false, err
			}

			return result.RowsAffected() > 0, nil
		},
	}
}

func (r *Resolver) createStoryboardField() *graphql.Field {
	return &graphql.Field{
		Type: StoryboardType,
		Args: graphql.FieldConfigArgument{
			"projectId":       &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"title":           &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"aspectRatio":     &graphql.ArgumentConfig{Type: graphql.String},
			"resolution":      &graphql.ArgumentConfig{Type: graphql.String},
			"durationSeconds": &graphql.ArgumentConfig{Type: graphql.Int},
			"numVariations":   &graphql.ArgumentConfig{Type: graphql.Int},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			projectID := p.Args["projectId"].(string)
			title := p.Args["title"].(string)
			aspectRatio, _ := p.Args["aspectRatio"].(string)
			resolution, _ := p.Args["resolution"].(string)
			durationSeconds, _ := p.Args["durationSeconds"].(int)
			numVariations, _ := p.Args["numVariations"].(int)

			projectUUID, err := uuid.Parse(projectID)
			if err != nil {
				return nil, err
			}

			if aspectRatio == "" {
				aspectRatio = "16:9"
			}
			if resolution == "" {
				resolution = "1920x1080"
			}
			if numVariations == 0 {
				numVariations = 1
			}

			var id, pID uuid.UUID
			var dur *int32
			var numVar int32
			var createdAt, updatedAt time.Time

			err = r.pool.QueryRow(ctx, `
				INSERT INTO storyboards (project_id, title, aspect_ratio, resolution, duration_seconds, num_variations)
				VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING id, project_id, title, aspect_ratio, resolution, duration_seconds, num_variations, created_at, updated_at
			`, projectUUID, title, aspectRatio, resolution, nullIfZero(durationSeconds), numVariations).Scan(
				&id, &pID, &title, &aspectRatio, &resolution, &dur, &numVar, &createdAt, &updatedAt)
			if err != nil {
				return nil, err
			}

			return map[string]interface{}{
				"id":              id.String(),
				"projectId":       pID.String(),
				"title":           title,
				"aspectRatio":     aspectRatio,
				"resolution":      resolution,
				"durationSeconds": dur,
				"numVariations":   numVar,
				"createdAt":       createdAt.Format(time.RFC3339),
				"updatedAt":       updatedAt.Format(time.RFC3339),
			}, nil
		},
	}
}

func (r *Resolver) updateStoryboardField() *graphql.Field {
	return &graphql.Field{
		Type: StoryboardType,
		Args: graphql.FieldConfigArgument{
			"id":              &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"title":           &graphql.ArgumentConfig{Type: graphql.String},
			"aspectRatio":     &graphql.ArgumentConfig{Type: graphql.String},
			"resolution":      &graphql.ArgumentConfig{Type: graphql.String},
			"durationSeconds": &graphql.ArgumentConfig{Type: graphql.Int},
			"numVariations":   &graphql.ArgumentConfig{Type: graphql.Int},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			storyboardID := p.Args["id"].(string)

			storyboardUUID, err := uuid.Parse(storyboardID)
			if err != nil {
				return nil, err
			}

			// Build dynamic update query
			var id, pID uuid.UUID
			var title, aspectRatio, resolution string
			var dur *int32
			var numVar int32
			var createdAt, updatedAt time.Time

			err = r.pool.QueryRow(ctx, `
				UPDATE storyboards SET
					title = COALESCE($1, title),
					aspect_ratio = COALESCE($2, aspect_ratio),
					resolution = COALESCE($3, resolution),
					duration_seconds = COALESCE($4, duration_seconds),
					num_variations = COALESCE($5, num_variations),
					updated_at = NOW()
				WHERE id = $6
				RETURNING id, project_id, title, aspect_ratio, resolution, duration_seconds, num_variations, created_at, updated_at
			`, nullIfEmpty(p.Args["title"].(string)),
				nullIfEmpty(p.Args["aspectRatio"].(string)),
				nullIfEmpty(p.Args["resolution"].(string)),
				nullIfZero(p.Args["durationSeconds"].(int)),
				nullIfZero(p.Args["numVariations"].(int)),
				storyboardUUID).Scan(&id, &pID, &title, &aspectRatio, &resolution, &dur, &numVar, &createdAt, &updatedAt)

			if err == pgx.ErrNoRows {
				return nil, errors.New("storyboard not found")
			}
			if err != nil {
				return nil, err
			}

			return map[string]interface{}{
				"id":              id.String(),
				"projectId":       pID.String(),
				"title":           title,
				"aspectRatio":     aspectRatio,
				"resolution":      resolution,
				"durationSeconds": dur,
				"numVariations":   numVar,
				"createdAt":       createdAt.Format(time.RFC3339),
				"updatedAt":       updatedAt.Format(time.RFC3339),
			}, nil
		},
	}
}

func (r *Resolver) deleteStoryboardField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			storyboardID := p.Args["id"].(string)

			storyboardUUID, err := uuid.Parse(storyboardID)
			if err != nil {
				return false, err
			}

			result, err := r.pool.Exec(ctx, `DELETE FROM storyboards WHERE id = $1`, storyboardUUID)
			if err != nil {
				return false, err
			}

			return result.RowsAffected() > 0, nil
		},
	}
}

func (r *Resolver) createSceneField() *graphql.Field {
	return &graphql.Field{
		Type: SceneType,
		Args: graphql.FieldConfigArgument{
			"storyboardId":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"sceneNumber":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Int)},
			"textDescription": &graphql.ArgumentConfig{Type: graphql.String},
			"mediaType":       &graphql.ArgumentConfig{Type: graphql.String},
			"transitionType":  &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			storyboardID := p.Args["storyboardId"].(string)
			sceneNumber := p.Args["sceneNumber"].(int)
			textDescription, _ := p.Args["textDescription"].(string)
			mediaType, _ := p.Args["mediaType"].(string)
			transitionType, _ := p.Args["transitionType"].(string)

			storyboardUUID, err := uuid.Parse(storyboardID)
			if err != nil {
				return nil, err
			}

			var id, sbID uuid.UUID
			var sceneNum int32
			var textDesc, mType, mUrl, tType *string
			var startTime, duration *float64
			var createdAt, updatedAt time.Time

			err = r.pool.QueryRow(ctx, `
				INSERT INTO scenes (storyboard_id, scene_number, text_description, media_type, transition_type)
				VALUES ($1, $2, $3, $4, $5)
				RETURNING id, storyboard_id, scene_number, text_description, media_type, media_url, start_time_seconds, duration_seconds, transition_type, created_at, updated_at
			`, storyboardUUID, sceneNumber, nullIfEmpty(textDescription), nullIfEmpty(mediaType), nullIfEmpty(transitionType)).Scan(
				&id, &sbID, &sceneNum, &textDesc, &mType, &mUrl, &startTime, &duration, &tType, &createdAt, &updatedAt)
			if err != nil {
				return nil, err
			}

			return map[string]interface{}{
				"id":               id.String(),
				"storyboardId":     sbID.String(),
				"sceneNumber":      sceneNum,
				"textDescription":  textDesc,
				"mediaType":        mType,
				"mediaUrl":         mUrl,
				"startTimeSeconds": startTime,
				"durationSeconds":  duration,
				"transitionType":   tType,
				"createdAt":        createdAt.Format(time.RFC3339),
				"updatedAt":        updatedAt.Format(time.RFC3339),
			}, nil
		},
	}
}

func (r *Resolver) updateSceneField() *graphql.Field {
	return &graphql.Field{
		Type: SceneType,
		Args: graphql.FieldConfigArgument{
			"id":               &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"textDescription":  &graphql.ArgumentConfig{Type: graphql.String},
			"mediaType":        &graphql.ArgumentConfig{Type: graphql.String},
			"startTimeSeconds": &graphql.ArgumentConfig{Type: graphql.Float},
			"durationSeconds":  &graphql.ArgumentConfig{Type: graphql.Float},
			"transitionType":   &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			sceneID := p.Args["id"].(string)

			sceneUUID, err := uuid.Parse(sceneID)
			if err != nil {
				return nil, err
			}

			var id, sbID uuid.UUID
			var sceneNum int32
			var textDesc, mType, mUrl, tType *string
			var startTime, duration *float64
			var createdAt, updatedAt time.Time

			err = r.pool.QueryRow(ctx, `
				UPDATE scenes SET
					text_description = COALESCE($1, text_description),
					media_type = COALESCE($2, media_type),
					start_time_seconds = COALESCE($3, start_time_seconds),
					duration_seconds = COALESCE($4, duration_seconds),
					transition_type = COALESCE($5, transition_type),
					updated_at = NOW()
				WHERE id = $6
				RETURNING id, storyboard_id, scene_number, text_description, media_type, media_url, start_time_seconds, duration_seconds, transition_type, created_at, updated_at
			`, nullIfEmpty(p.Args["textDescription"].(string)),
				nullIfEmpty(p.Args["mediaType"].(string)),
				p.Args["startTimeSeconds"],
				p.Args["durationSeconds"],
				nullIfEmpty(p.Args["transitionType"].(string)),
				sceneUUID).Scan(&id, &sbID, &sceneNum, &textDesc, &mType, &mUrl, &startTime, &duration, &tType, &createdAt, &updatedAt)

			if err == pgx.ErrNoRows {
				return nil, errors.New("scene not found")
			}
			if err != nil {
				return nil, err
			}

			return map[string]interface{}{
				"id":               id.String(),
				"storyboardId":     sbID.String(),
				"sceneNumber":      sceneNum,
				"textDescription":  textDesc,
				"mediaType":        mType,
				"mediaUrl":         mUrl,
				"startTimeSeconds": startTime,
				"durationSeconds":  duration,
				"transitionType":   tType,
				"createdAt":        createdAt.Format(time.RFC3339),
				"updatedAt":        updatedAt.Format(time.RFC3339),
			}, nil
		},
	}
}

func (r *Resolver) deleteSceneField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			sceneID := p.Args["id"].(string)

			sceneUUID, err := uuid.Parse(sceneID)
			if err != nil {
				return false, err
			}

			result, err := r.pool.Exec(ctx, `DELETE FROM scenes WHERE id = $1`, sceneUUID)
			if err != nil {
				return false, err
			}

			return result.RowsAffected() > 0, nil
		},
	}
}

func (r *Resolver) generateImageField() *graphql.Field {
	return &graphql.Field{
		Type: GeneratedImageType,
		Args: graphql.FieldConfigArgument{
			"sceneId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"prompt":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"model":   &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			// This will be implemented with OpenAI service integration
			return nil, errors.New("image generation not yet implemented")
		},
	}
}

func (r *Resolver) createCharacterField() *graphql.Field {
	return &graphql.Field{
		Type: CharacterType,
		Args: graphql.FieldConfigArgument{
			"projectId":          &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"name":               &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"description":        &graphql.ArgumentConfig{Type: graphql.String},
			"personality":        &graphql.ArgumentConfig{Type: graphql.String},
			"background":         &graphql.ArgumentConfig{Type: graphql.String},
			"defaultHumeVoiceId": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			projectID := p.Args["projectId"].(string)
			name := p.Args["name"].(string)
			description, _ := p.Args["description"].(string)
			personality, _ := p.Args["personality"].(string)
			background, _ := p.Args["background"].(string)
			defaultHumeVoiceId, _ := p.Args["defaultHumeVoiceId"].(string)

			projectUUID, err := uuid.Parse(projectID)
			if err != nil {
				return nil, err
			}

			var id, pID uuid.UUID
			var desc, pers, bg, voiceId *string
			var profileImageId *uuid.UUID
			var createdAt, updatedAt time.Time

			err = r.pool.QueryRow(ctx, `
				INSERT INTO characters (project_id, name, description, personality, background, default_hume_voice_id)
				VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING id, project_id, name, description, personality, background, default_hume_voice_id, profile_image_id, created_at, updated_at
			`, projectUUID, name, nullIfEmpty(description), nullIfEmpty(personality), nullIfEmpty(background), nullIfEmpty(defaultHumeVoiceId)).Scan(
				&id, &pID, &name, &desc, &pers, &bg, &voiceId, &profileImageId, &createdAt, &updatedAt)
			if err != nil {
				return nil, err
			}

			result := map[string]interface{}{
				"id":                 id.String(),
				"projectId":          pID.String(),
				"name":               name,
				"description":        desc,
				"personality":        pers,
				"background":         bg,
				"defaultHumeVoiceId": voiceId,
				"createdAt":          createdAt.Format(time.RFC3339),
				"updatedAt":          updatedAt.Format(time.RFC3339),
			}
			if profileImageId != nil {
				result["profileImageId"] = profileImageId.String()
			}
			return result, nil
		},
	}
}

func (r *Resolver) updateCharacterField() *graphql.Field {
	return &graphql.Field{
		Type: CharacterType,
		Args: graphql.FieldConfigArgument{
			"id":                 &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"name":               &graphql.ArgumentConfig{Type: graphql.String},
			"description":        &graphql.ArgumentConfig{Type: graphql.String},
			"personality":        &graphql.ArgumentConfig{Type: graphql.String},
			"background":         &graphql.ArgumentConfig{Type: graphql.String},
			"defaultHumeVoiceId": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			characterID := p.Args["id"].(string)

			characterUUID, err := uuid.Parse(characterID)
			if err != nil {
				return nil, err
			}

			var id, pID uuid.UUID
			var name string
			var desc, pers, bg, voiceId *string
			var profileImageId *uuid.UUID
			var createdAt, updatedAt time.Time

			err = r.pool.QueryRow(ctx, `
				UPDATE characters SET
					name = COALESCE($1, name),
					description = COALESCE($2, description),
					personality = COALESCE($3, personality),
					background = COALESCE($4, background),
					default_hume_voice_id = COALESCE($5, default_hume_voice_id),
					updated_at = NOW()
				WHERE id = $6
				RETURNING id, project_id, name, description, personality, background, default_hume_voice_id, profile_image_id, created_at, updated_at
			`, nullIfEmpty(p.Args["name"].(string)),
				nullIfEmpty(p.Args["description"].(string)),
				nullIfEmpty(p.Args["personality"].(string)),
				nullIfEmpty(p.Args["background"].(string)),
				nullIfEmpty(p.Args["defaultHumeVoiceId"].(string)),
				characterUUID).Scan(&id, &pID, &name, &desc, &pers, &bg, &voiceId, &profileImageId, &createdAt, &updatedAt)

			if err == pgx.ErrNoRows {
				return nil, errors.New("character not found")
			}
			if err != nil {
				return nil, err
			}

			result := map[string]interface{}{
				"id":                 id.String(),
				"projectId":          pID.String(),
				"name":               name,
				"description":        desc,
				"personality":        pers,
				"background":         bg,
				"defaultHumeVoiceId": voiceId,
				"createdAt":          createdAt.Format(time.RFC3339),
				"updatedAt":          updatedAt.Format(time.RFC3339),
			}
			if profileImageId != nil {
				result["profileImageId"] = profileImageId.String()
			}
			return result, nil
		},
	}
}

func (r *Resolver) deleteCharacterField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			characterID := p.Args["id"].(string)

			characterUUID, err := uuid.Parse(characterID)
			if err != nil {
				return false, err
			}

			result, err := r.pool.Exec(ctx, `DELETE FROM characters WHERE id = $1`, characterUUID)
			if err != nil {
				return false, err
			}

			return result.RowsAffected() > 0, nil
		},
	}
}

func (r *Resolver) createDialogueField() *graphql.Field {
	return &graphql.Field{
		Type: DialogueType,
		Args: graphql.FieldConfigArgument{
			"sceneId":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"characterId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"language":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"text":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"orderIndex":  &graphql.ArgumentConfig{Type: graphql.Int},
			"humeVoiceId": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			sceneID := p.Args["sceneId"].(string)
			characterID := p.Args["characterId"].(string)
			language := p.Args["language"].(string)
			text := p.Args["text"].(string)
			orderIndex, _ := p.Args["orderIndex"].(int)
			humeVoiceId, _ := p.Args["humeVoiceId"].(string)

			sceneUUID, err := uuid.Parse(sceneID)
			if err != nil {
				return nil, err
			}
			characterUUID, err := uuid.Parse(characterID)
			if err != nil {
				return nil, err
			}

			var id, sID, cID uuid.UUID
			var lang, txt string
			var translatedText, voiceId, audioUrl *string
			var startTime, duration *float64
			var orderIdx int32
			var createdAt, updatedAt time.Time

			err = r.pool.QueryRow(ctx, `
				INSERT INTO dialogues (scene_id, character_id, language, text, order_index, hume_voice_id)
				VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING id, scene_id, character_id, language, text, translated_text, hume_voice_id, audio_url, start_time_seconds, duration_seconds, order_index, created_at, updated_at
			`, sceneUUID, characterUUID, language, text, orderIndex, nullIfEmpty(humeVoiceId)).Scan(
				&id, &sID, &cID, &lang, &txt, &translatedText, &voiceId, &audioUrl, &startTime, &duration, &orderIdx, &createdAt, &updatedAt)
			if err != nil {
				return nil, err
			}

			return map[string]interface{}{
				"id":               id.String(),
				"sceneId":          sID.String(),
				"characterId":      cID.String(),
				"language":         lang,
				"text":             txt,
				"translatedText":   translatedText,
				"humeVoiceId":      voiceId,
				"audioUrl":         audioUrl,
				"startTimeSeconds": startTime,
				"durationSeconds":  duration,
				"orderIndex":       orderIdx,
				"createdAt":        createdAt.Format(time.RFC3339),
				"updatedAt":        updatedAt.Format(time.RFC3339),
			}, nil
		},
	}
}

func (r *Resolver) updateDialogueField() *graphql.Field {
	return &graphql.Field{
		Type: DialogueType,
		Args: graphql.FieldConfigArgument{
			"id":          &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"text":        &graphql.ArgumentConfig{Type: graphql.String},
			"orderIndex":  &graphql.ArgumentConfig{Type: graphql.Int},
			"humeVoiceId": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			dialogueID := p.Args["id"].(string)

			dialogueUUID, err := uuid.Parse(dialogueID)
			if err != nil {
				return nil, err
			}

			var id, sID, cID uuid.UUID
			var lang, txt string
			var translatedText, voiceId, audioUrl *string
			var startTime, duration *float64
			var orderIdx int32
			var createdAt, updatedAt time.Time

			err = r.pool.QueryRow(ctx, `
				UPDATE dialogues SET
					text = COALESCE($1, text),
					order_index = COALESCE($2, order_index),
					hume_voice_id = COALESCE($3, hume_voice_id),
					updated_at = NOW()
				WHERE id = $4
				RETURNING id, scene_id, character_id, language, text, translated_text, hume_voice_id, audio_url, start_time_seconds, duration_seconds, order_index, created_at, updated_at
			`, nullIfEmpty(p.Args["text"].(string)),
				nullIfZero(p.Args["orderIndex"].(int)),
				nullIfEmpty(p.Args["humeVoiceId"].(string)),
				dialogueUUID).Scan(&id, &sID, &cID, &lang, &txt, &translatedText, &voiceId, &audioUrl, &startTime, &duration, &orderIdx, &createdAt, &updatedAt)

			if err == pgx.ErrNoRows {
				return nil, errors.New("dialogue not found")
			}
			if err != nil {
				return nil, err
			}

			return map[string]interface{}{
				"id":               id.String(),
				"sceneId":          sID.String(),
				"characterId":      cID.String(),
				"language":         lang,
				"text":             txt,
				"translatedText":   translatedText,
				"humeVoiceId":      voiceId,
				"audioUrl":         audioUrl,
				"startTimeSeconds": startTime,
				"durationSeconds":  duration,
				"orderIndex":       orderIdx,
				"createdAt":        createdAt.Format(time.RFC3339),
				"updatedAt":        updatedAt.Format(time.RFC3339),
			}, nil
		},
	}
}

func (r *Resolver) deleteDialogueField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			dialogueID := p.Args["id"].(string)

			dialogueUUID, err := uuid.Parse(dialogueID)
			if err != nil {
				return false, err
			}

			result, err := r.pool.Exec(ctx, `DELETE FROM dialogues WHERE id = $1`, dialogueUUID)
			if err != nil {
				return false, err
			}

			return result.RowsAffected() > 0, nil
		},
	}
}

func (r *Resolver) generateDialogueAudioField() *graphql.Field {
	return &graphql.Field{
		Type: DialogueType,
		Args: graphql.FieldConfigArgument{
			"dialogueId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			// This will be implemented with Hume service integration
			return nil, errors.New("audio generation not yet implemented")
		},
	}
}

func (r *Resolver) createComposerField() *graphql.Field {
	return &graphql.Field{
		Type: ComposerType,
		Args: graphql.FieldConfigArgument{
			"projectId":       &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"title":           &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"durationSeconds": &graphql.ArgumentConfig{Type: graphql.Float},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			projectID := p.Args["projectId"].(string)
			title := p.Args["title"].(string)
			durationSeconds, _ := p.Args["durationSeconds"].(float64)

			projectUUID, err := uuid.Parse(projectID)
			if err != nil {
				return nil, err
			}

			var id, pID uuid.UUID
			var dur *float64
			var createdAt, updatedAt time.Time

			err = r.pool.QueryRow(ctx, `
				INSERT INTO composers (project_id, title, duration_seconds)
				VALUES ($1, $2, $3)
				RETURNING id, project_id, title, duration_seconds, created_at, updated_at
			`, projectUUID, title, nullIfZeroFloat(durationSeconds)).Scan(&id, &pID, &title, &dur, &createdAt, &updatedAt)
			if err != nil {
				return nil, err
			}

			return map[string]interface{}{
				"id":              id.String(),
				"projectId":       pID.String(),
				"title":           title,
				"durationSeconds": dur,
				"createdAt":       createdAt.Format(time.RFC3339),
				"updatedAt":       updatedAt.Format(time.RFC3339),
			}, nil
		},
	}
}

func (r *Resolver) updateComposerField() *graphql.Field {
	return &graphql.Field{
		Type: ComposerType,
		Args: graphql.FieldConfigArgument{
			"id":              &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"title":           &graphql.ArgumentConfig{Type: graphql.String},
			"durationSeconds": &graphql.ArgumentConfig{Type: graphql.Float},
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
			var dur *float64
			var createdAt, updatedAt time.Time

			err = r.pool.QueryRow(ctx, `
				UPDATE composers SET
					title = COALESCE($1, title),
					duration_seconds = COALESCE($2, duration_seconds),
					updated_at = NOW()
				WHERE id = $3
				RETURNING id, project_id, title, duration_seconds, created_at, updated_at
			`, nullIfEmpty(p.Args["title"].(string)),
				p.Args["durationSeconds"],
				composerUUID).Scan(&id, &pID, &title, &dur, &createdAt, &updatedAt)

			if err == pgx.ErrNoRows {
				return nil, errors.New("composer not found")
			}
			if err != nil {
				return nil, err
			}

			return map[string]interface{}{
				"id":              id.String(),
				"projectId":       pID.String(),
				"title":           title,
				"durationSeconds": dur,
				"createdAt":       createdAt.Format(time.RFC3339),
				"updatedAt":       updatedAt.Format(time.RFC3339),
			}, nil
		},
	}
}

func (r *Resolver) deleteComposerField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			composerID := p.Args["id"].(string)

			composerUUID, err := uuid.Parse(composerID)
			if err != nil {
				return false, err
			}

			result, err := r.pool.Exec(ctx, `DELETE FROM composers WHERE id = $1`, composerUUID)
			if err != nil {
				return false, err
			}

			return result.RowsAffected() > 0, nil
		},
	}
}

func (r *Resolver) createAudioTrackField() *graphql.Field {
	return &graphql.Field{
		Type: AudioTrackType,
		Args: graphql.FieldConfigArgument{
			"composerId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"trackNumber": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Int)},
			"trackType":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"name":        &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			composerID := p.Args["composerId"].(string)
			trackNumber := p.Args["trackNumber"].(int)
			trackType := p.Args["trackType"].(string)
			name, _ := p.Args["name"].(string)

			composerUUID, err := uuid.Parse(composerID)
			if err != nil {
				return nil, err
			}

			var id, cID uuid.UUID
			var trackNum int32
			var tType string
			var trackName *string
			var createdAt, updatedAt time.Time

			err = r.pool.QueryRow(ctx, `
				INSERT INTO audio_tracks (composer_id, track_number, track_type, name)
				VALUES ($1, $2, $3, $4)
				RETURNING id, composer_id, track_number, track_type, name, created_at, updated_at
			`, composerUUID, trackNumber, trackType, nullIfEmpty(name)).Scan(
				&id, &cID, &trackNum, &tType, &trackName, &createdAt, &updatedAt)
			if err != nil {
				return nil, err
			}

			return map[string]interface{}{
				"id":          id.String(),
				"composerId":  cID.String(),
				"trackNumber": trackNum,
				"trackType":   tType,
				"name":        trackName,
				"createdAt":   createdAt.Format(time.RFC3339),
				"updatedAt":   updatedAt.Format(time.RFC3339),
			}, nil
		},
	}
}

func (r *Resolver) createAudioClipField() *graphql.Field {
	return &graphql.Field{
		Type: AudioClipType,
		Args: graphql.FieldConfigArgument{
			"trackId":          &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"startTimeSeconds": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Float)},
			"durationSeconds":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Float)},
			"audioType":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"audioUrl":         &graphql.ArgumentConfig{Type: graphql.String},
			"metadata":         &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			trackID := p.Args["trackId"].(string)
			startTimeSeconds := p.Args["startTimeSeconds"].(float64)
			durationSeconds := p.Args["durationSeconds"].(float64)
			audioType := p.Args["audioType"].(string)
			audioUrl, _ := p.Args["audioUrl"].(string)
			metadata, _ := p.Args["metadata"].(string)

			trackUUID, err := uuid.Parse(trackID)
			if err != nil {
				return nil, err
			}

			var id, tID uuid.UUID
			var audioDataId *uuid.UUID
			var startTime, duration float64
			var aType string
			var aUrl, meta *string
			var createdAt, updatedAt time.Time

			err = r.pool.QueryRow(ctx, `
				INSERT INTO audio_clips (track_id, start_time_seconds, duration_seconds, audio_type, audio_url, metadata)
				VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING id, track_id, start_time_seconds, duration_seconds, audio_type, audio_url, audio_data_id, metadata, created_at, updated_at
			`, trackUUID, startTimeSeconds, durationSeconds, audioType, nullIfEmpty(audioUrl), nullIfEmpty(metadata)).Scan(
				&id, &tID, &startTime, &duration, &aType, &aUrl, &audioDataId, &meta, &createdAt, &updatedAt)
			if err != nil {
				return nil, err
			}

			result := map[string]interface{}{
				"id":               id.String(),
				"trackId":          tID.String(),
				"startTimeSeconds": startTime,
				"durationSeconds":  duration,
				"audioType":        aType,
				"audioUrl":         aUrl,
				"metadata":         meta,
				"createdAt":        createdAt.Format(time.RFC3339),
				"updatedAt":        updatedAt.Format(time.RFC3339),
			}
			if audioDataId != nil {
				result["audioDataId"] = audioDataId.String()
			}
			return result, nil
		},
	}
}

func (r *Resolver) generateSunoMusicField() *graphql.Field {
	return &graphql.Field{
		Type: SunoMusicType,
		Args: graphql.FieldConfigArgument{
			"composerId": &graphql.ArgumentConfig{Type: graphql.ID},
			"prompt":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			// This will be implemented with Suno service integration
			return nil, errors.New("music generation not yet implemented")
		},
	}
}

func (r *Resolver) createScenarioField() *graphql.Field {
	return &graphql.Field{
		Type: ScenarioType,
		Args: graphql.FieldConfigArgument{
			"projectId":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"title":       &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"description": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			clerkAuth := auth.GetAuthFromContext(ctx)

			projectID := p.Args["projectId"].(string)
			title := p.Args["title"].(string)
			description, _ := p.Args["description"].(string)

			projectUUID, err := uuid.Parse(projectID)
			if err != nil {
				return nil, err
			}

			var id, pID uuid.UUID
			var desc *string
			var createdAt, updatedAt time.Time

			err = r.pool.QueryRow(ctx, `
				INSERT INTO scenarios (project_id, title, description, org_id)
				VALUES ($1, $2, $3, $4)
				RETURNING id, project_id, title, description, created_at, updated_at
			`, projectUUID, title, nullIfEmpty(description), nullIfEmpty(clerkAuth.OrgID)).Scan(&id, &pID, &title, &desc, &createdAt, &updatedAt)
			if err != nil {
				return nil, err
			}

			return map[string]interface{}{
				"id":          id.String(),
				"projectId":   pID.String(),
				"title":       title,
				"description": desc,
				"createdAt":   createdAt.Format(time.RFC3339),
				"updatedAt":   updatedAt.Format(time.RFC3339),
			}, nil
		},
	}
}

func (r *Resolver) updateScenarioField() *graphql.Field {
	return &graphql.Field{
		Type: ScenarioType,
		Args: graphql.FieldConfigArgument{
			"id":          &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"title":       &graphql.ArgumentConfig{Type: graphql.String},
			"description": &graphql.ArgumentConfig{Type: graphql.String},
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
			var desc *string
			var createdAt, updatedAt time.Time

			err = r.pool.QueryRow(ctx, `
				UPDATE scenarios SET
					title = COALESCE($1, title),
					description = COALESCE($2, description),
					updated_at = NOW()
				WHERE id = $3
				RETURNING id, project_id, title, description, created_at, updated_at
			`, nullIfEmpty(p.Args["title"].(string)),
				nullIfEmpty(p.Args["description"].(string)),
				scenarioUUID).Scan(&id, &pID, &title, &desc, &createdAt, &updatedAt)

			if err == pgx.ErrNoRows {
				return nil, errors.New("scenario not found")
			}
			if err != nil {
				return nil, err
			}

			return map[string]interface{}{
				"id":          id.String(),
				"projectId":   pID.String(),
				"title":       title,
				"description": desc,
				"createdAt":   createdAt.Format(time.RFC3339),
				"updatedAt":   updatedAt.Format(time.RFC3339),
			}, nil
		},
	}
}

func (r *Resolver) deleteScenarioField() *graphql.Field {
	return &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			ctx := p.Context
			scenarioID := p.Args["id"].(string)

			scenarioUUID, err := uuid.Parse(scenarioID)
			if err != nil {
				return false, err
			}

			result, err := r.pool.Exec(ctx, `DELETE FROM scenarios WHERE id = $1`, scenarioUUID)
			if err != nil {
				return false, err
			}

			return result.RowsAffected() > 0, nil
		},
	}
}

// Helper functions
func nullIfZero(n int) *int32 {
	if n == 0 {
		return nil
	}
	v := int32(n)
	return &v
}

func nullIfZeroFloat(f float64) *float64 {
	if f == 0 {
		return nil
	}
	return &f
}
