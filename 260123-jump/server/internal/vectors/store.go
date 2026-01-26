package vectors

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

// VectorEntry represents a single vector with metadata
type VectorEntry struct {
	ID            string    `json:"gh:id"`
	EpisodeID     string    `json:"gh:episodeId,omitempty"`
	ActID         string    `json:"gh:actId,omitempty"`
	PageNumber    int       `json:"gh:pageNumber,omitempty"`
	PanelIndex    int       `json:"gh:panelIndex,omitempty"`
	DialogueIndex int       `json:"gh:dialogueIndex,omitempty"`
	Speaker       string    `json:"gh:speaker,omitempty"`
	Text          string    `json:"gh:text"`
	Emotion       string    `json:"gh:emotion,omitempty"`
	Subtext       string    `json:"gh:subtext,omitempty"`
	Vector        []float32 `json:"gh:vector"`
}

// CollectionMeta holds metadata about a vector collection
type CollectionMeta struct {
	Name       string    `json:"gh:name"`
	SourceFile string    `json:"gh:sourceFile"`
	Count      int       `json:"gh:count"`
	Dimensions int       `json:"gh:dimensions"`
	Model      string    `json:"gh:model"`
	UpdatedAt  time.Time `json:"gh:updatedAt"`
}

// VectorStore manages vector embeddings stored in JSON files
type VectorStore struct {
	mu          sync.RWMutex
	baseDir     string
	collections map[string]*Collection
}

// Collection represents a collection of vectors
type Collection struct {
	Meta    CollectionMeta  `json:"gh:meta"`
	Entries []VectorEntry   `json:"gh:vectors"`
	byID    map[string]int  // id → index in Entries
}

// NewVectorStore creates a new vector store
func NewVectorStore(baseDir string) (*VectorStore, error) {
	vectorsDir := filepath.Join(baseDir, "_vectors")
	
	// Create directory if it doesn't exist
	if err := os.MkdirAll(vectorsDir, 0755); err != nil {
		return nil, err
	}

	vs := &VectorStore{
		baseDir:     vectorsDir,
		collections: make(map[string]*Collection),
	}

	// Load existing collections
	if err := vs.loadAll(); err != nil {
		return nil, err
	}

	return vs, nil
}

// loadAll loads all existing collections from disk
func (vs *VectorStore) loadAll() error {
	indexPath := filepath.Join(vs.baseDir, "index.json")
	
	// Check if index exists
	if _, err := os.Stat(indexPath); os.IsNotExist(err) {
		// Create empty index
		return vs.saveIndex()
	}

	// Load index
	data, err := os.ReadFile(indexPath)
	if err != nil {
		return err
	}

	var indexDoc struct {
		Collections map[string]CollectionMeta `json:"gh:collections"`
	}
	if err := json.Unmarshal(data, &indexDoc); err != nil {
		return err
	}

	// Load each collection
	for name, meta := range indexDoc.Collections {
		if err := vs.loadCollection(name, meta.SourceFile); err != nil {
			// Log but continue
			fmt.Printf("Warning: failed to load collection %s: %v\n", name, err)
		}
	}

	return nil
}

// loadCollection loads a single collection from disk
func (vs *VectorStore) loadCollection(name, sourceFile string) error {
	path := filepath.Join(vs.baseDir, sourceFile)
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	var doc struct {
		Meta    CollectionMeta `json:"gh:meta"`
		Vectors []VectorEntry  `json:"gh:vectors"`
	}
	if err := json.Unmarshal(data, &doc); err != nil {
		return err
	}

	col := &Collection{
		Meta:    doc.Meta,
		Entries: doc.Vectors,
		byID:    make(map[string]int),
	}

	// Build ID index
	for i, entry := range col.Entries {
		col.byID[entry.ID] = i
	}

	vs.mu.Lock()
	vs.collections[name] = col
	vs.mu.Unlock()

	return nil
}

// saveIndex saves the collections index
func (vs *VectorStore) saveIndex() error {
	vs.mu.RLock()
	defer vs.mu.RUnlock()

	collections := make(map[string]CollectionMeta)
	for name, col := range vs.collections {
		collections[name] = col.Meta
	}

	indexDoc := map[string]interface{}{
		"@context": map[string]interface{}{
			"gh": "https://ghosthacker.gftd.ai/ns/",
		},
		"@id":            "gh:vectorIndex",
		"gh:collections": collections,
	}

	data, err := json.MarshalIndent(indexDoc, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filepath.Join(vs.baseDir, "index.json"), data, 0644)
}

// SaveCollection saves a collection to disk
func (vs *VectorStore) SaveCollection(name string) error {
	vs.mu.RLock()
	col, ok := vs.collections[name]
	vs.mu.RUnlock()

	if !ok {
		return fmt.Errorf("collection %s not found", name)
	}

	doc := struct {
		Context map[string]interface{} `json:"@context"`
		ID      string                 `json:"@id"`
		Meta    CollectionMeta         `json:"gh:meta"`
		Vectors []VectorEntry          `json:"gh:vectors"`
	}{
		Context: map[string]interface{}{
			"gh": "https://ghosthacker.gftd.ai/ns/",
		},
		ID:      "gh:vectors/" + name,
		Meta:    col.Meta,
		Vectors: col.Entries,
	}

	data, err := json.MarshalIndent(doc, "", "  ")
	if err != nil {
		return err
	}

	if err := os.WriteFile(filepath.Join(vs.baseDir, col.Meta.SourceFile), data, 0644); err != nil {
		return err
	}

	return vs.saveIndex()
}

// CreateCollection creates a new collection
func (vs *VectorStore) CreateCollection(name string, dimensions int, model string) error {
	vs.mu.Lock()
	defer vs.mu.Unlock()

	if _, ok := vs.collections[name]; ok {
		return fmt.Errorf("collection %s already exists", name)
	}

	vs.collections[name] = &Collection{
		Meta: CollectionMeta{
			Name:       name,
			SourceFile: name + ".json",
			Count:      0,
			Dimensions: dimensions,
			Model:      model,
			UpdatedAt:  time.Now(),
		},
		Entries: []VectorEntry{},
		byID:    make(map[string]int),
	}

	return nil
}

// Upsert adds or updates a vector entry
func (vs *VectorStore) Upsert(collectionName string, entry VectorEntry) error {
	vs.mu.Lock()
	defer vs.mu.Unlock()

	col, ok := vs.collections[collectionName]
	if !ok {
		return fmt.Errorf("collection %s not found", collectionName)
	}

	if idx, exists := col.byID[entry.ID]; exists {
		// Update existing
		col.Entries[idx] = entry
	} else {
		// Add new
		col.byID[entry.ID] = len(col.Entries)
		col.Entries = append(col.Entries, entry)
		col.Meta.Count = len(col.Entries)
	}

	col.Meta.UpdatedAt = time.Now()
	return nil
}

// Delete removes a vector entry
func (vs *VectorStore) Delete(collectionName, id string) error {
	vs.mu.Lock()
	defer vs.mu.Unlock()

	col, ok := vs.collections[collectionName]
	if !ok {
		return fmt.Errorf("collection %s not found", collectionName)
	}

	idx, exists := col.byID[id]
	if !exists {
		return nil // Already deleted
	}

	// Remove from slice
	col.Entries = append(col.Entries[:idx], col.Entries[idx+1:]...)
	
	// Rebuild ID index
	col.byID = make(map[string]int)
	for i, entry := range col.Entries {
		col.byID[entry.ID] = i
	}

	col.Meta.Count = len(col.Entries)
	col.Meta.UpdatedAt = time.Now()
	return nil
}

// SearchOptions defines options for vector search
type SearchOptions struct {
	Collection  string
	QueryVector []float32
	TopK        int
	
	// Filters
	Speaker   string
	EpisodeID string
	ActID     string
	ActMin    int // Act number minimum (e.g., >= 3)
	Emotion   string
}

// SearchResult represents a search result with score
type SearchResult struct {
	Entry    VectorEntry
	Score    float32
	Distance float32
}

// Search performs vector similarity search with optional filters
func (vs *VectorStore) Search(opts SearchOptions) ([]SearchResult, error) {
	vs.mu.RLock()
	defer vs.mu.RUnlock()

	col, ok := vs.collections[opts.Collection]
	if !ok {
		return nil, fmt.Errorf("collection %s not found", opts.Collection)
	}

	if len(opts.QueryVector) == 0 {
		return nil, fmt.Errorf("query vector is required")
	}

	// Filter entries
	var filtered []VectorEntry
	for _, entry := range col.Entries {
		// Apply filters
		if opts.Speaker != "" && entry.Speaker != opts.Speaker {
			continue
		}
		if opts.EpisodeID != "" && entry.EpisodeID != opts.EpisodeID {
			continue
		}
		if opts.ActID != "" && entry.ActID != opts.ActID {
			continue
		}
		if opts.ActMin > 0 {
			actNum := extractActNumber(entry.ActID)
			if actNum < opts.ActMin {
				continue
			}
		}
		if opts.Emotion != "" && entry.Emotion != opts.Emotion {
			continue
		}
		filtered = append(filtered, entry)
	}

	// Calculate similarities
	type scored struct {
		entry    VectorEntry
		score    float32
		distance float32
	}
	var results []scored

	for _, entry := range filtered {
		if len(entry.Vector) == 0 {
			continue
		}
		score := cosineSimilarity(opts.QueryVector, entry.Vector)
		results = append(results, scored{
			entry:    entry,
			score:    score,
			distance: 1 - score,
		})
	}

	// Sort by score (descending)
	sort.Slice(results, func(i, j int) bool {
		return results[i].score > results[j].score
	})

	// Return top-K
	topK := opts.TopK
	if topK <= 0 {
		topK = 5
	}
	if topK > len(results) {
		topK = len(results)
	}

	var searchResults []SearchResult
	for i := 0; i < topK; i++ {
		searchResults = append(searchResults, SearchResult{
			Entry:    results[i].entry,
			Score:    results[i].score,
			Distance: results[i].distance,
		})
	}

	return searchResults, nil
}

// GetByID retrieves a vector entry by ID
func (vs *VectorStore) GetByID(collectionName, id string) (*VectorEntry, error) {
	vs.mu.RLock()
	defer vs.mu.RUnlock()

	col, ok := vs.collections[collectionName]
	if !ok {
		return nil, fmt.Errorf("collection %s not found", collectionName)
	}

	idx, exists := col.byID[id]
	if !exists {
		return nil, fmt.Errorf("entry %s not found", id)
	}

	entry := col.Entries[idx]
	return &entry, nil
}

// ListCollections returns all collection names
func (vs *VectorStore) ListCollections() []string {
	vs.mu.RLock()
	defer vs.mu.RUnlock()

	var names []string
	for name := range vs.collections {
		names = append(names, name)
	}
	return names
}

// GetCollectionMeta returns metadata for a collection
func (vs *VectorStore) GetCollectionMeta(name string) (*CollectionMeta, error) {
	vs.mu.RLock()
	defer vs.mu.RUnlock()

	col, ok := vs.collections[name]
	if !ok {
		return nil, fmt.Errorf("collection %s not found", name)
	}

	meta := col.Meta
	return &meta, nil
}

// Helper functions

func cosineSimilarity(a, b []float32) float32 {
	if len(a) != len(b) {
		return 0
	}

	var dot, normA, normB float32
	for i := range a {
		dot += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}

	if normA == 0 || normB == 0 {
		return 0
	}

	return dot / (float32(math.Sqrt(float64(normA))) * float32(math.Sqrt(float64(normB))))
}

func extractActNumber(actID string) int {
	// Extract act number from actID like "act:260123-privacy:3" or "act:V1StGXR8_..."
	// For nanoid-based IDs, we need to look up the metadata
	// For now, return 0 if we can't extract
	if actID == "" {
		return 0
	}
	
	// Try to parse number from end of ID
	// e.g., "act:260123-privacy:3" → 3
	for i := len(actID) - 1; i >= 0; i-- {
		if actID[i] == ':' {
			numStr := actID[i+1:]
			if len(numStr) == 1 && numStr[0] >= '0' && numStr[0] <= '9' {
				return int(numStr[0] - '0')
			}
			break
		}
	}
	
	return 0
}
