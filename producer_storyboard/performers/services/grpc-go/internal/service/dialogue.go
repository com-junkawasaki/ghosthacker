package service

import (
	"context"
	"encoding/base64"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/auth"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/db/sqlc"
	storyboardv1 "github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/storyboard/v1"
)

// ListDialogues lists dialogues for a scene
func (s *StoryboardService) ListDialogues(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListDialoguesRequest],
) (*connect.Response[storyboardv1.ListDialoguesResponse], error) {
	sceneID, err := uuid.Parse(req.Msg.SceneId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	dialogues, err := s.queries.ListDialogues(ctx, uuidToPgUUID(sceneID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbDialogues := make([]*storyboardv1.Dialogue, 0, len(dialogues))
	for _, d := range dialogues {
		pbDialogues = append(pbDialogues, convertDialogueRowToProto(d))
	}

	return connect.NewResponse(&storyboardv1.ListDialoguesResponse{
		Dialogues: pbDialogues,
	}), nil
}

// GetDialogue retrieves a dialogue by ID
func (s *StoryboardService) GetDialogue(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetDialogueRequest],
) (*connect.Response[storyboardv1.Dialogue], error) {
	dialogueID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	d, err := s.queries.GetDialogue(ctx, uuidToPgUUID(dialogueID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(convertGetDialogueRowToProto(d)), nil
}

// CreateDialogue creates a new dialogue
func (s *StoryboardService) CreateDialogue(
	ctx context.Context,
	req *connect.Request[storyboardv1.CreateDialogueRequest],
) (*connect.Response[storyboardv1.Dialogue], error) {
	sceneID, err := uuid.Parse(req.Msg.SceneId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	characterID, err := uuid.Parse(req.Msg.CharacterId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	orderIndex := int32(0)
	if req.Msg.OrderIndex != nil {
		orderIndex = *req.Msg.OrderIndex
	}

	d, err := s.queries.CreateDialogue(ctx, sqlc.CreateDialogueParams{
		SceneID:     uuidToPgUUID(sceneID),
		CharacterID: uuidToPgUUID(characterID),
		Language:    req.Msg.Language,
		Text:        req.Msg.Text,
		OrderIndex:  int32ToPgInt4(&orderIndex),
		HumeVoiceID: stringToPgText(req.Msg.HumeVoiceId),
		OrgID:       orgIDPg,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(convertCreateDialogueRowToProto(d)), nil
}

// UpdateDialogue updates an existing dialogue
func (s *StoryboardService) UpdateDialogue(
	ctx context.Context,
	req *connect.Request[storyboardv1.UpdateDialogueRequest],
) (*connect.Response[storyboardv1.Dialogue], error) {
	dialogueID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var orderIndex *int32
	if req.Msg.OrderIndex != nil {
		orderIndex = req.Msg.OrderIndex
	}

	text := ""
	if req.Msg.Text != nil {
		text = *req.Msg.Text
	}
	d, err := s.queries.UpdateDialogue(ctx, sqlc.UpdateDialogueParams{
		ID:          uuidToPgUUID(dialogueID),
		Text:        text,
		OrderIndex:  int32ToPgInt4(orderIndex),
		HumeVoiceID: stringToPgText(req.Msg.HumeVoiceId),
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(convertUpdateDialogueRowToProto(d)), nil
}

// DeleteDialogue deletes a dialogue
func (s *StoryboardService) DeleteDialogue(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteDialogueRequest],
) (*connect.Response[storyboardv1.DeleteDialogueResponse], error) {
	dialogueID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteDialogue(ctx, uuidToPgUUID(dialogueID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteDialogueResponse{
		Success: true,
	}), nil
}

// GetDialogueAudioData retrieves dialogue audio data as base64
func (s *StoryboardService) GetDialogueAudioData(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetDialogueAudioDataRequest],
) (*connect.Response[storyboardv1.GetDialogueAudioDataResponse], error) {
	dialogueID, err := uuid.Parse(req.Msg.DialogueId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	result, err := s.queries.GetDialogueAudioData(ctx, uuidToPgUUID(dialogueID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	base64Data := base64.StdEncoding.EncodeToString(result)

	return connect.NewResponse(&storyboardv1.GetDialogueAudioDataResponse{
		AudioDataBase64: base64Data,
	}), nil
}

// GenerateDialogueAudio generates audio for a dialogue using Hume AI
func (s *StoryboardService) GenerateDialogueAudio(
	ctx context.Context,
	req *connect.Request[storyboardv1.GenerateDialogueAudioRequest],
) (*connect.Response[storyboardv1.GenerateDialogueAudioResponse], error) {
	if s.hume == nil {
		return nil, connect.NewError(connect.CodeUnimplemented, nil)
	}

	dialogueID, err := uuid.Parse(req.Msg.DialogueId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	// Get dialogue
	dialogue, err := s.queries.GetDialogue(ctx, uuidToPgUUID(dialogueID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Use character's default voice or dialogue's voice
	voiceID := ""
	if dialogue.HumeVoiceID.Valid {
		voiceID = dialogue.HumeVoiceID.String
	} else {
		// Get character's default voice
		char, err := s.queries.GetCharacter(ctx, dialogue.CharacterID)
		if err == nil && char.DefaultHumeVoiceID.Valid {
			voiceID = char.DefaultHumeVoiceID.String
		}
	}

	if voiceID == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, nil)
	}

	// Generate audio using Hume service
	result, err := s.hume.GenerateSpeech(ctx, dialogue.Text, voiceID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Update dialogue with audio data
	updatedDialogue, err := s.queries.UpdateDialogueAudio(ctx, sqlc.UpdateDialogueAudioParams{
		ID:              uuidToPgUUID(dialogueID),
		AudioData:       result.AudioData,
		AudioUrl:        pgtype.Text{Valid: false, String: ""},
		DurationSeconds: float64ToPgNumeric(&result.Duration),
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.GenerateDialogueAudioResponse{
		Dialogue: convertUpdateDialogueAudioRowToProto(updatedDialogue),
	}), nil
}

func convertDialogueToProto(d sqlc.Dialogue) *storyboardv1.Dialogue {
	orderIndex := int32(0)
	if d.OrderIndex.Valid {
		orderIndex = int32(d.OrderIndex.Int32)
	}
	pbDialogue := &storyboardv1.Dialogue{
		Id:               pgUUIDToString(d.ID),
		SceneId:          pgUUIDToString(d.SceneID),
		CharacterId:      pgUUIDToString(d.CharacterID),
		Language:         d.Language,
		Text:             d.Text,
		TranslatedText:   stringPtr(string(d.TranslatedText)),
		HumeVoiceId:      pgTextToString(d.HumeVoiceID),
		AudioUrl:         pgTextToString(d.AudioUrl),
		StartTimeSeconds: pgNumericToFloat64(d.StartTimeSeconds),
		DurationSeconds:  pgNumericToFloat64(d.DurationSeconds),
		OrderIndex:       orderIndex,
		CreatedAt:        pgTimestamptzToString(d.CreatedAt),
		UpdatedAt:        pgTimestamptzToString(d.UpdatedAt),
	}
	return pbDialogue
}

func convertDialogueRowToProto(d sqlc.ListDialoguesRow) *storyboardv1.Dialogue {
	orderIndex := int32(0)
	if d.OrderIndex.Valid {
		orderIndex = int32(d.OrderIndex.Int32)
	}
	var translatedText *string
	if len(d.TranslatedText) > 0 {
		translatedText = stringPtr(string(d.TranslatedText))
	}
	pbDialogue := &storyboardv1.Dialogue{
		Id:               pgUUIDToString(d.ID),
		SceneId:          pgUUIDToString(d.SceneID),
		CharacterId:      pgUUIDToString(d.CharacterID),
		Language:         d.Language,
		Text:             d.Text,
		TranslatedText:   translatedText,
		HumeVoiceId:      pgTextToString(d.HumeVoiceID),
		AudioUrl:         pgTextToString(d.AudioUrl),
		StartTimeSeconds: pgNumericToFloat64(d.StartTimeSeconds),
		DurationSeconds:  pgNumericToFloat64(d.DurationSeconds),
		OrderIndex:       orderIndex,
		CreatedAt:        pgTimestamptzToString(d.CreatedAt),
		UpdatedAt:        pgTimestamptzToString(d.UpdatedAt),
	}
	return pbDialogue
}

func convertGetDialogueRowToProto(d sqlc.GetDialogueRow) *storyboardv1.Dialogue {
	orderIndex := int32(0)
	if d.OrderIndex.Valid {
		orderIndex = int32(d.OrderIndex.Int32)
	}
	var translatedText *string
	if len(d.TranslatedText) > 0 {
		translatedText = stringPtr(string(d.TranslatedText))
	}
	pbDialogue := &storyboardv1.Dialogue{
		Id:               pgUUIDToString(d.ID),
		SceneId:          pgUUIDToString(d.SceneID),
		CharacterId:      pgUUIDToString(d.CharacterID),
		Language:         d.Language,
		Text:             d.Text,
		TranslatedText:   translatedText,
		HumeVoiceId:      pgTextToString(d.HumeVoiceID),
		AudioUrl:         pgTextToString(d.AudioUrl),
		StartTimeSeconds: pgNumericToFloat64(d.StartTimeSeconds),
		DurationSeconds:  pgNumericToFloat64(d.DurationSeconds),
		OrderIndex:       orderIndex,
		CreatedAt:        pgTimestamptzToString(d.CreatedAt),
		UpdatedAt:        pgTimestamptzToString(d.UpdatedAt),
	}
	return pbDialogue
}

func convertCreateDialogueRowToProto(d sqlc.CreateDialogueRow) *storyboardv1.Dialogue {
	orderIndex := int32(0)
	if d.OrderIndex.Valid {
		orderIndex = int32(d.OrderIndex.Int32)
	}
	var translatedText *string
	if len(d.TranslatedText) > 0 {
		translatedText = stringPtr(string(d.TranslatedText))
	}
	pbDialogue := &storyboardv1.Dialogue{
		Id:               pgUUIDToString(d.ID),
		SceneId:          pgUUIDToString(d.SceneID),
		CharacterId:      pgUUIDToString(d.CharacterID),
		Language:         d.Language,
		Text:             d.Text,
		TranslatedText:   translatedText,
		HumeVoiceId:      pgTextToString(d.HumeVoiceID),
		AudioUrl:         pgTextToString(d.AudioUrl),
		StartTimeSeconds: pgNumericToFloat64(d.StartTimeSeconds),
		DurationSeconds:  pgNumericToFloat64(d.DurationSeconds),
		OrderIndex:       orderIndex,
		CreatedAt:        pgTimestamptzToString(d.CreatedAt),
		UpdatedAt:        pgTimestamptzToString(d.UpdatedAt),
	}
	return pbDialogue
}

func convertUpdateDialogueRowToProto(d sqlc.UpdateDialogueRow) *storyboardv1.Dialogue {
	orderIndex := int32(0)
	if d.OrderIndex.Valid {
		orderIndex = int32(d.OrderIndex.Int32)
	}
	var translatedText *string
	if len(d.TranslatedText) > 0 {
		translatedText = stringPtr(string(d.TranslatedText))
	}
	pbDialogue := &storyboardv1.Dialogue{
		Id:               pgUUIDToString(d.ID),
		SceneId:          pgUUIDToString(d.SceneID),
		CharacterId:      pgUUIDToString(d.CharacterID),
		Language:         d.Language,
		Text:             d.Text,
		TranslatedText:   translatedText,
		HumeVoiceId:      pgTextToString(d.HumeVoiceID),
		AudioUrl:         pgTextToString(d.AudioUrl),
		StartTimeSeconds: pgNumericToFloat64(d.StartTimeSeconds),
		DurationSeconds:  pgNumericToFloat64(d.DurationSeconds),
		OrderIndex:       orderIndex,
		CreatedAt:        pgTimestamptzToString(d.CreatedAt),
		UpdatedAt:        pgTimestamptzToString(d.UpdatedAt),
	}
	return pbDialogue
}

func convertUpdateDialogueAudioRowToProto(d sqlc.UpdateDialogueAudioRow) *storyboardv1.Dialogue {
	orderIndex := int32(0)
	if d.OrderIndex.Valid {
		orderIndex = int32(d.OrderIndex.Int32)
	}
	var translatedText *string
	if len(d.TranslatedText) > 0 {
		translatedText = stringPtr(string(d.TranslatedText))
	}
	pbDialogue := &storyboardv1.Dialogue{
		Id:               pgUUIDToString(d.ID),
		SceneId:          pgUUIDToString(d.SceneID),
		CharacterId:      pgUUIDToString(d.CharacterID),
		Language:         d.Language,
		Text:             d.Text,
		TranslatedText:   translatedText,
		HumeVoiceId:      pgTextToString(d.HumeVoiceID),
		AudioUrl:         pgTextToString(d.AudioUrl),
		StartTimeSeconds: pgNumericToFloat64(d.StartTimeSeconds),
		DurationSeconds:  pgNumericToFloat64(d.DurationSeconds),
		OrderIndex:       orderIndex,
		CreatedAt:        pgTimestamptzToString(d.CreatedAt),
		UpdatedAt:        pgTimestamptzToString(d.UpdatedAt),
	}
	return pbDialogue
}
