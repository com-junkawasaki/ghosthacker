package temporal

import (
	"context"
	"github.com/gftd-ai/ghost-hacker/apps/zen-editor/backend/internal/ai"
	"github.com/gftd-ai/ghost-hacker/apps/zen-editor/backend/internal/git"
)

type Activities struct {
	OpenRouter *ai.OpenRouterClient
	Hume       *ai.HumeClient
	Git        *git.GitService
}

func (a *Activities) ExtractEntitiesActivity(ctx context.Context, text string) (string, error) {
	return a.OpenRouter.ExtractEntities(ctx, text)
}

func (a *Activities) AnalyzeEmotionsActivity(ctx context.Context, text string) (map[string]float64, error) {
	return a.Hume.AnalyzeEmotions(ctx, text)
}

func (a *Activities) GitCommitActivity(ctx context.Context, filePath, message string) error {
	return a.Git.CommitDocument(filePath, message)
}

