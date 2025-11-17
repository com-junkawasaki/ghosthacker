/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:System
 * @id https://gftd.ai/performer/system/neo4j
 * 
 * Neo4j database connection and query implementation
 */
package ports

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"

	"github.com/gftd/epub-editor-graphql-go/graph/model"
)

// Neo4jPool wraps Neo4j driver with connection pool
type Neo4jPool struct {
	Driver neo4j.DriverWithContext
}

// NewNeo4jPool creates a new Neo4j connection pool
func NewNeo4jPool(ctx context.Context) (*Neo4jPool, error) {
	uri := os.Getenv("NEO4J_URI")
	if uri == "" {
		uri = "bolt://localhost:7687"
	}
	user := os.Getenv("NEO4J_USER")
	if user == "" {
		user = "neo4j"
	}
	password := os.Getenv("NEO4J_PASSWORD")
	if password == "" {
		password = "password"
	}

	driver, err := neo4j.NewDriverWithContext(uri, neo4j.BasicAuth(user, password, ""))
	if err != nil {
		return nil, fmt.Errorf("failed to create Neo4j driver: %w", err)
	}

	// Verify connectivity
	if err := driver.VerifyConnectivity(ctx); err != nil {
		driver.Close(ctx)
		return nil, fmt.Errorf("failed to verify Neo4j connectivity: %w", err)
	}

	// Create indexes
	session := driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	indexes := []string{
		"CREATE INDEX IF NOT EXISTS FOR (e:Epub) ON (e.id)",
		"CREATE INDEX IF NOT EXISTS FOR (c:Chapter) ON (c.id)",
		"CREATE INDEX IF NOT EXISTS FOR (m:Media) ON (m.id)",
		"CREATE CONSTRAINT IF NOT EXISTS FOR (e:Epub) REQUIRE e.id IS UNIQUE",
		"CREATE CONSTRAINT IF NOT EXISTS FOR (c:Chapter) REQUIRE c.id IS UNIQUE",
		"CREATE CONSTRAINT IF NOT EXISTS FOR (m:Media) REQUIRE m.id IS UNIQUE",
	}

	for _, query := range indexes {
		_, err := session.Run(ctx, query, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to create index/constraint: %w", err)
		}
	}

	return &Neo4jPool{Driver: driver}, nil
}

// Close closes the Neo4j driver
func (p *Neo4jPool) Close(ctx context.Context) error {
	return p.Driver.Close(ctx)
}

// GetEpub retrieves an EPUB by ID
func (p *Neo4jPool) GetEpub(ctx context.Context, id string) (*model.Epub, error) {
	session := p.Driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	result, err := session.Run(ctx,
		"MATCH (e:Epub {id: $id}) RETURN e",
		map[string]interface{}{"id": id},
	)
	if err != nil {
		return nil, err
	}

	record, err := result.Single(ctx)
	if err != nil {
		return nil, nil // Not found
	}

	node, ok := record.Values[0].(neo4j.Node)
	if !ok {
		return nil, fmt.Errorf("unexpected node type")
	}

	return p.nodeToEpub(ctx, node)
}

// ListEpubs retrieves all EPUBs
func (p *Neo4jPool) ListEpubs(ctx context.Context) ([]*model.Epub, error) {
	session := p.Driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	result, err := session.Run(ctx,
		"MATCH (e:Epub) RETURN e ORDER BY e.created_at DESC",
		nil,
	)
	if err != nil {
		return nil, err
	}

	var epubs []*model.Epub
	for result.Next(ctx) {
		record := result.Record()
		node, ok := record.Values[0].(neo4j.Node)
		if !ok {
			continue
		}
		epub, err := p.nodeToEpub(ctx, node)
		if err != nil {
			continue
		}
		epubs = append(epubs, epub)
	}

	return epubs, result.Err()
}

// CreateEpub creates a new EPUB
func (p *Neo4jPool) CreateEpub(ctx context.Context, title, language string) (*model.Epub, error) {
	session := p.Driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	id := uuid.New().String()
	now := time.Now().Format(time.RFC3339)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		result, err := tx.Run(ctx,
			`CREATE (e:Epub {
				id: $id,
				title: $title,
				language: $language,
				created_at: $created_at,
				updated_at: $updated_at
			}) RETURN e`,
			map[string]interface{}{
				"id":         id,
				"title":      title,
				"language":   language,
				"created_at": now,
				"updated_at": now,
			},
		)
		if err != nil {
			return nil, err
		}
		return result.Single(ctx)
	})
	if err != nil {
		return nil, err
	}

	return p.GetEpub(ctx, id)
}

// UpdateEpub updates an existing EPUB
func (p *Neo4jPool) UpdateEpub(ctx context.Context, id string, title, language *string) (*model.Epub, error) {
	session := p.Driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	updates := []string{"e.updated_at = datetime()"}
	params := map[string]interface{}{"id": id}

	if title != nil {
		updates = append(updates, "e.title = $title")
		params["title"] = *title
	}
	if language != nil {
		updates = append(updates, "e.language = $language")
		params["language"] = *language
	}

	// Build SET clause
	setClause := ""
	for i, update := range updates {
		if i > 0 {
			setClause += ", "
		}
		setClause += update
	}

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		result, err := tx.Run(ctx,
			fmt.Sprintf("MATCH (e:Epub {id: $id}) SET %s RETURN e", setClause),
			params,
		)
		if err != nil {
			return nil, err
		}
		return result.Single(ctx)
	})
	if err != nil {
		return nil, err
	}

	return p.GetEpub(ctx, id)
}

// DeleteEpub deletes an EPUB
func (p *Neo4jPool) DeleteEpub(ctx context.Context, id string) (bool, error) {
	session := p.Driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	result, err := session.Run(ctx,
		"MATCH (e:Epub {id: $id}) DETACH DELETE e RETURN count(e) as deleted",
		map[string]interface{}{"id": id},
	)
	if err != nil {
		return false, err
	}

	record, err := result.Single(ctx)
	if err != nil {
		return false, err
	}

	deleted, ok := record.Values[0].(int64)
	if !ok {
		return false, fmt.Errorf("unexpected deleted count type")
	}

	return deleted > 0, nil
}

// GetChapter retrieves a chapter by ID
func (p *Neo4jPool) GetChapter(ctx context.Context, id string) (*model.Chapter, error) {
	session := p.Driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	result, err := session.Run(ctx,
		"MATCH (c:Chapter {id: $id}) RETURN c",
		map[string]interface{}{"id": id},
	)
	if err != nil {
		return nil, err
	}

	record, err := result.Single(ctx)
	if err != nil {
		return nil, nil // Not found
	}

	node, ok := record.Values[0].(neo4j.Node)
	if !ok {
		return nil, fmt.Errorf("unexpected node type")
	}

	return p.nodeToChapter(ctx, node)
}

// GetChapters retrieves chapters for an EPUB
func (p *Neo4jPool) GetChapters(ctx context.Context, epubID string) ([]*model.Chapter, error) {
	session := p.Driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	result, err := session.Run(ctx,
		"MATCH (e:Epub {id: $epub_id})-[:HAS_CHAPTER]->(c:Chapter) RETURN c ORDER BY c.order ASC",
		map[string]interface{}{"epub_id": epubID},
	)
	if err != nil {
		return nil, err
	}

	var chapters []*model.Chapter
	for result.Next(ctx) {
		record := result.Record()
		node, ok := record.Values[0].(neo4j.Node)
		if !ok {
			continue
		}
		chapter, err := p.nodeToChapter(ctx, node)
		if err != nil {
			continue
		}
		chapters = append(chapters, chapter)
	}

	return chapters, result.Err()
}

// CreateChapter creates a new chapter
func (p *Neo4jPool) CreateChapter(ctx context.Context, epubID, title string, order int, contentHTML string) (*model.Chapter, error) {
	session := p.Driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	id := uuid.New().String()

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		result, err := tx.Run(ctx,
			`MATCH (e:Epub {id: $epub_id})
			 CREATE (c:Chapter {
				 id: $id,
				 title: $title,
				 order: $order,
				 content_html: $content_html
			 })
			 CREATE (e)-[:HAS_CHAPTER]->(c)
			 RETURN c`,
			map[string]interface{}{
				"epub_id":     epubID,
				"id":          id,
				"title":       title,
				"order":       order,
				"content_html": contentHTML,
			},
		)
		if err != nil {
			return nil, err
		}
		return result.Single(ctx)
	})
	if err != nil {
		return nil, err
	}

	return p.GetChapter(ctx, id)
}

// UpdateChapter updates an existing chapter
func (p *Neo4jPool) UpdateChapter(ctx context.Context, id string, title *string, order *int, contentHTML *string) (*model.Chapter, error) {
	session := p.Driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	updates := []string{}
	params := map[string]interface{}{"id": id}

	if title != nil {
		updates = append(updates, "c.title = $title")
		params["title"] = *title
	}
	if order != nil {
		updates = append(updates, "c.order = $order")
		params["order"] = *order
	}
	if contentHTML != nil {
		updates = append(updates, "c.content_html = $content_html")
		params["content_html"] = *contentHTML
	}

	if len(updates) == 0 {
		return p.GetChapter(ctx, id)
	}

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		setClause := ""
		for i, update := range updates {
			if i > 0 {
				setClause += ", "
			}
			setClause += update
		}
		result, err := tx.Run(ctx,
			fmt.Sprintf("MATCH (c:Chapter {id: $id}) SET %s RETURN c", setClause),
			params,
		)
		if err != nil {
			return nil, err
		}
		return result.Single(ctx)
	})
	if err != nil {
		return nil, err
	}

	return p.GetChapter(ctx, id)
}

// DeleteChapter deletes a chapter
func (p *Neo4jPool) DeleteChapter(ctx context.Context, id string) (bool, error) {
	session := p.Driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	result, err := session.Run(ctx,
		"MATCH (c:Chapter {id: $id}) DETACH DELETE c RETURN count(c) as deleted",
		map[string]interface{}{"id": id},
	)
	if err != nil {
		return false, err
	}

	record, err := result.Single(ctx)
	if err != nil {
		return false, err
	}

	deleted, ok := record.Values[0].(int64)
	if !ok {
		return false, fmt.Errorf("unexpected deleted count type")
	}

	return deleted > 0, nil
}

// GetMedia retrieves media by ID
func (p *Neo4jPool) GetMedia(ctx context.Context, id string) (*model.Media, error) {
	session := p.Driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	result, err := session.Run(ctx,
		"MATCH (m:Media {id: $id}) RETURN m",
		map[string]interface{}{"id": id},
	)
	if err != nil {
		return nil, err
	}

	record, err := result.Single(ctx)
	if err != nil {
		return nil, nil // Not found
	}

	node, ok := record.Values[0].(neo4j.Node)
	if !ok {
		return nil, fmt.Errorf("unexpected node type")
	}

	return p.nodeToMedia(node)
}

// CreateMedia creates a new media item
func (p *Neo4jPool) CreateMedia(ctx context.Context, chapterID, mediaType, url, mimeType string, fileSize int64) (*model.Media, error) {
	session := p.Driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	id := uuid.New().String()

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		result, err := tx.Run(ctx,
			`MATCH (c:Chapter {id: $chapter_id})
			 CREATE (m:Media {
				 id: $id,
				 type: $type,
				 url: $url,
				 mime_type: $mime_type,
				 file_size: $file_size
			 })
			 CREATE (c)-[:HAS_MEDIA]->(m)
			 RETURN m`,
			map[string]interface{}{
				"chapter_id": chapterID,
				"id":         id,
				"type":       mediaType,
				"url":        url,
				"mime_type":  mimeType,
				"file_size":  fileSize,
			},
		)
		if err != nil {
			return nil, err
		}
		return result.Single(ctx)
	})
	if err != nil {
		return nil, err
	}

	return p.GetMedia(ctx, id)
}

// GetMetadata retrieves metadata for an EPUB
func (p *Neo4jPool) GetMetadata(ctx context.Context, epubID string) ([]*model.MetadataItem, error) {
	session := p.Driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	result, err := session.Run(ctx,
		"MATCH (e:Epub {id: $epub_id})-[:HAS_METADATA]->(m:Metadata) RETURN m.key as key, m.value as value",
		map[string]interface{}{"epub_id": epubID},
	)
	if err != nil {
		return nil, err
	}

	var metadata []*model.MetadataItem
	for result.Next(ctx) {
		record := result.Record()
		key, _ := record.Get("key")
		value, _ := record.Get("value")
		metadata = append(metadata, &model.MetadataItem{
			Key:   key.(string),
			Value: value.(string),
		})
	}

	return metadata, result.Err()
}

// UpdateMetadata updates metadata for an EPUB
func (p *Neo4jPool) UpdateMetadata(ctx context.Context, epubID, key, value string) (*model.MetadataItem, error) {
	session := p.Driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		result, err := tx.Run(ctx,
			`MATCH (e:Epub {id: $epub_id})
			 MERGE (m:Metadata {key: $key})
			 ON CREATE SET m.value = $value
			 ON MATCH SET m.value = $value
			 MERGE (e)-[:HAS_METADATA]->(m)
			 RETURN m.key as key, m.value as value`,
			map[string]interface{}{
				"epub_id": epubID,
				"key":     key,
				"value":   value,
			},
		)
		if err != nil {
			return nil, err
		}
		return result.Single(ctx)
	})
	if err != nil {
		return nil, err
	}

	return &model.MetadataItem{Key: key, Value: value}, nil
}

// Helper functions to convert Neo4j nodes to GraphQL types

func (p *Neo4jPool) nodeToEpub(ctx context.Context, node neo4j.Node) (*model.Epub, error) {
	id, _ := node.Props["id"].(string)
	title, _ := node.Props["title"].(string)
	language, _ := node.Props["language"].(string)
	if language == "" {
		language = "en"
	}
	createdAt, _ := node.Props["created_at"].(string)
	updatedAt, _ := node.Props["updated_at"].(string)

	chapters, _ := p.GetChapters(ctx, id)
	metadata, _ := p.GetMetadata(ctx, id)

	return &model.Epub{
		ID:        id,
		Title:     title,
		Language:  language,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
		Chapters:  chapters,
		Metadata:  metadata,
	}, nil
}

func (p *Neo4jPool) nodeToChapter(ctx context.Context, node neo4j.Node) (*model.Chapter, error) {
	id, _ := node.Props["id"].(string)
	title, _ := node.Props["title"].(string)
	order, _ := node.Props["order"].(int64)
	contentHTML, _ := node.Props["content_html"].(string)

	// Get media
	session := p.Driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	result, err := session.Run(ctx,
		"MATCH (c:Chapter {id: $id})-[:HAS_MEDIA]->(m:Media) RETURN m",
		map[string]interface{}{"id": id},
	)
	if err != nil {
		return nil, err
	}

	var media []*model.Media
	for result.Next(ctx) {
		record := result.Record()
		mediaNode, ok := record.Values[0].(neo4j.Node)
		if !ok {
			continue
		}
		m, err := p.nodeToMedia(mediaNode)
		if err != nil {
			continue
		}
		media = append(media, m)
	}

	return &model.Chapter{
		ID:          id,
		Title:       title,
		Order:       int(order),
		ContentHTML: contentHTML,
		Paragraphs:  []*model.Paragraph{}, // Simplified for now
		Media:       media,
	}, nil
}

func (p *Neo4jPool) nodeToMedia(node neo4j.Node) (*model.Media, error) {
	id, _ := node.Props["id"].(string)
	mediaType, _ := node.Props["type"].(string)
	url, _ := node.Props["url"].(string)
	mimeType, _ := node.Props["mime_type"].(string)
	fileSize, _ := node.Props["file_size"].(int64)

	return &model.Media{
		ID:       id,
		Type:     mediaType,
		URL:      url,
		MimeType: mimeType,
		FileSize: int(fileSize),
	}, nil
}

