package service

import (
	"context"
	"encoding/base64"
	"time"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

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

	dialogues, err := s.queries.ListDialogues(ctx, sceneID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbDialogues := make([]*storyboardv1.Dialogue, 0, len(dialogues))
	for _, d := range dialogues {
		pbDialogues = append(pbDialogues, convertDialogueToProto(d))
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

	d, err := s.queries.GetDialogue(ctx, dialogueID)
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(convertDialogueToProto(d)), nil
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
	var orgIDPtr *string
	if orgID != "" {
		orgIDPtr = &orgID
	}

	orderIndex := int32(0)
	if req.Msg.OrderIndex != nil {
		orderIndex = *req.Msg.OrderIndex
	}

	d, err := s.queries.CreateDialogue(ctx, sqlc.CreateDialogueParams{
		SceneID:     sceneID,
		CharacterID: characterID,
		Language:    req.Msg.Language,
		Text:        req.Msg.Text,
		OrderIndex:  orderIndex,
		HumeVoiceID: req.Msg.HumeVoiceId,
		OrgID:       orgIDPtr,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(convertDialogueToProto(d)), nil
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

	d, err := s.queries.UpdateDialogue(ctx, sqlc.UpdateDialogueParams{
		ID:          dialogueID,
		Text:        req.Msg.Text,
		OrderIndex:  orderIndex,
		HumeVoiceID: req.Msg.HumeVoiceId,
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(convertDialogueToProto(d)), nil
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

	err = s.queries.DeleteDialogue(ctx, dialogueID)
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

	result, err := s.queries.GetDialogueAudioData(ctx, dialogueID)
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	base64Data := base64.StdEncoding.EncodeToString(result.AudioData)

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
	dialogue, err := s.queries.GetDialogue(ctx, dialogueID)
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Use character's default voice or dialogue's voice
	voiceID := dialogue.HumeVoiceID
	if voiceID == nil {
		// Get character's default voice
		char, err := s.queries.GetCharacter(ctx, dialogue.CharacterID)
		if err == nil && char.DefaultHumeVoiceID != nil {
			voiceID = char.DefaultHumeVoiceID
		}
	}

	if voiceID == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, nil)
	}

	// Generate audio using Hume service
	result, err := s.hume.GenerateSpeech(ctx, dialogue.Text, *voiceID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Update dialogue with audio data
	updatedDialogue, err := s.queries.UpdateDialogueAudio(ctx, sqlc.UpdateDialogueAudioParams{
		ID:              dialogueID,
		AudioData:       result.AudioData,
		AudioUrl:        nil,
		DurationSeconds: &result.Duration,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.GenerateDialogueAudioResponse{
		Dialogue: convertDialogueToProto(updatedDialogue),
	}), nil
}

func convertDialogueToProto(d sqlc.Dialogue) *storyboardv1.Dialogue {
	pbDialogue := &storyboardv1.Dialogue{
		Id:               d.ID.String(),
		SceneId:          d.SceneID.String(),
		CharacterId:      d.CharacterID.String(),
		Language:         d.Language,
		Text:             d.Text,
		TranslatedText:   d.TranslatedText,
		HumeVoiceId:      d.HumeVoiceID,
		AudioUrl:         d.AudioUrl,
		StartTimeSeconds: d.StartTimeSeconds,
		DurationSeconds:  d.DurationSeconds,
		OrderIndex:       int32(d.OrderIndex),
		CreatedAt:        d.CreatedAt.Format(time.RFC3339),
		UpdatedAt:        d.UpdatedAt.Format(time.RFC3339),
	}
	return pbDialogue
}
