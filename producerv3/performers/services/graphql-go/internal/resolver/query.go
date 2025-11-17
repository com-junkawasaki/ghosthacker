/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/edit-epub-content
 * 
 * GraphQL Query resolvers
 */
package resolver

import (
	"context"

	"github.com/gftd/epub-editor-graphql-go/graph/model"
)

// Epub is the resolver for the epub field.
func (r *Resolver) Epub(ctx context.Context, id string) (*model.Epub, error) {
	return r.neo4jPool.GetEpub(ctx, id)
}

// EpubList is the resolver for the epubList field.
func (r *Resolver) EpubList(ctx context.Context) ([]*model.Epub, error) {
	return r.neo4jPool.ListEpubs(ctx)
}

// Chapter is the resolver for the chapter field.
func (r *Resolver) Chapter(ctx context.Context, id string) (*model.Chapter, error) {
	return r.neo4jPool.GetChapter(ctx, id)
}

// Chapters is the resolver for the chapters field.
func (r *Resolver) Chapters(ctx context.Context, epubID string) ([]*model.Chapter, error) {
	return r.neo4jPool.GetChapters(ctx, epubID)
}

// Media is the resolver for the media field.
func (r *Resolver) Media(ctx context.Context, id string) (*model.Media, error) {
	return r.neo4jPool.GetMedia(ctx, id)
}

// Metadata is the resolver for the metadata field.
func (r *Resolver) Metadata(ctx context.Context, epubID string) ([]*model.MetadataItem, error) {
	return r.neo4jPool.GetMetadata(ctx, epubID)
}

