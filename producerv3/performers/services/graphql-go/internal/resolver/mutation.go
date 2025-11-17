/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/manage-chapters
 * 
 * GraphQL Mutation resolvers
 */
package resolver

import (
	"context"

	"github.com/gftd/epub-editor-graphql-go/graph/model"
	"github.com/gftd/epub-editor-graphql-go/internal/ports"
)

// CreateEpub is the resolver for the createEpub field.
func (r *Resolver) CreateEpub(ctx context.Context, input model.CreateEpubInput) (*model.Epub, error) {
	return r.neo4jPool.CreateEpub(ctx, input.Title, input.Language)
}

// UpdateEpub is the resolver for the updateEpub field.
func (r *Resolver) UpdateEpub(ctx context.Context, input model.UpdateEpubInput) (*model.Epub, error) {
	var title, language *string
	if input.Title != nil {
		title = input.Title
	}
	if input.Language != nil {
		language = input.Language
	}
	return r.neo4jPool.UpdateEpub(ctx, input.ID, title, language)
}

// DeleteEpub is the resolver for the deleteEpub field.
func (r *Resolver) DeleteEpub(ctx context.Context, id string) (bool, error) {
	return r.neo4jPool.DeleteEpub(ctx, id)
}

// CreateChapter is the resolver for the createChapter field.
func (r *Resolver) CreateChapter(ctx context.Context, input model.CreateChapterInput) (*model.Chapter, error) {
	contentHTML := ""
	if input.ContentHTML != nil {
		contentHTML = *input.ContentHTML
	}
	return r.neo4jPool.CreateChapter(ctx, input.EpubID, input.Title, input.Order, contentHTML)
}

// UpdateChapter is the resolver for the updateChapter field.
func (r *Resolver) UpdateChapter(ctx context.Context, input model.UpdateChapterInput) (*model.Chapter, error) {
	var title, contentHTML *string
	var order *int
	if input.Title != nil {
		title = input.Title
	}
	if input.Order != nil {
		order = input.Order
	}
	if input.ContentHTML != nil {
		contentHTML = input.ContentHTML
	}
	return r.neo4jPool.UpdateChapter(ctx, input.ID, title, order, contentHTML)
}

// DeleteChapter is the resolver for the deleteChapter field.
func (r *Resolver) DeleteChapter(ctx context.Context, id string) (bool, error) {
	return r.neo4jPool.DeleteChapter(ctx, id)
}

// CreateMedia is the resolver for the createMedia field.
func (r *Resolver) CreateMedia(ctx context.Context, input model.CreateMediaInput) (*model.Media, error) {
	return r.neo4jPool.CreateMedia(ctx, input.ChapterID, input.Type, input.URL, input.MimeType, int64(input.FileSize))
}

// UpdateMetadata is the resolver for the updateMetadata field.
func (r *Resolver) UpdateMetadata(ctx context.Context, input model.UpdateMetadataInput) (*model.MetadataItem, error) {
	return r.neo4jPool.UpdateMetadata(ctx, input.EpubID, input.Key, input.Value)
}

// GenerateText is the resolver for the generateText field.
func (r *Resolver) GenerateText(ctx context.Context, input model.GenerateTextInput) (*model.GeneratedText, error) {
	return ports.GenerateText(ctx, input)
}

// Summarize is the resolver for the summarize field.
func (r *Resolver) Summarize(ctx context.Context, input model.SummarizeInput) (*model.GeneratedText, error) {
	return ports.SummarizeChapter(ctx, r.neo4jPool, input)
}

// Proofread is the resolver for the proofread field.
func (r *Resolver) Proofread(ctx context.Context, input model.ProofreadInput) (*model.GeneratedText, error) {
	return ports.ProofreadChapter(ctx, r.neo4jPool, input)
}

// Translate is the resolver for the translate field.
func (r *Resolver) Translate(ctx context.Context, input model.TranslateInput) (*model.GeneratedText, error) {
	return ports.TranslateChapter(ctx, r.neo4jPool, input)
}

