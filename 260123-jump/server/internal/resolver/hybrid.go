package resolver

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

// Document represents a loaded JSON-LD document
type Document struct {
	ID       string                 `json:"@id"`
	Type     []string               `json:"@type,omitempty"`
	Data     map[string]interface{} `json:"-"`
	FilePath string                 `json:"-"`
}

// Context provides resolution context (current file, parent document)
type Context struct {
	CurrentFile string
	ParentPath  string
	EpisodeID   string
}

// ConventionRule defines prefix → path pattern mapping
type ConventionRule struct {
	Prefix  string
	Pattern string // e.g., "characters/%s/profile.jsonld" or "characters/%s.jsonld"
}

// HybridResolver resolves JSON-LD references using multiple strategies
type HybridResolver struct {
	BaseDir     string
	conventions []ConventionRule
	mu          sync.RWMutex
	cache       map[string]*Document
	index       *Index
}

// Index holds id → path mappings for fast lookup
type Index struct {
	ByID     map[string]string // @id → relative path
	BySlug   map[string]string // slug → @id
	ByNumber map[string]string // number-based key → @id
}

// NewHybridResolver creates a new resolver
func NewHybridResolver(baseDir string) *HybridResolver {
	r := &HybridResolver{
		BaseDir: baseDir,
		conventions: []ConventionRule{
			// Current hierarchical structure
			{Prefix: "character:", Pattern: "characters/%s/profile.jsonld"},
			{Prefix: "env:", Pattern: "environments/%s/profile.jsonld"},
			{Prefix: "company:", Pattern: "organizations/%s/profile.jsonld"},
			{Prefix: "family:", Pattern: "organizations/%s/profile.jsonld"},
			{Prefix: "gh:org/", Pattern: "organizations/%s/profile.jsonld"},
			{Prefix: "episode:", Pattern: "episodes/%s/episode.jsonld"},
			// Hybrid flat structure (fallback)
			{Prefix: "character:", Pattern: "characters/%s.jsonld"},
			{Prefix: "env:", Pattern: "environments/%s.jsonld"},
			{Prefix: "company:", Pattern: "organizations/%s.jsonld"},
			{Prefix: "episode:", Pattern: "episodes/%s.jsonld"},
		},
		cache: make(map[string]*Document),
		index: &Index{
			ByID:     make(map[string]string),
			BySlug:   make(map[string]string),
			ByNumber: make(map[string]string),
		},
	}
	return r
}

// BuildIndex scans all JSON-LD files and builds the index
func (r *HybridResolver) BuildIndex() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.index = &Index{
		ByID:     make(map[string]string),
		BySlug:   make(map[string]string),
		ByNumber: make(map[string]string),
	}

	return filepath.Walk(r.BaseDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // skip errors
		}
		if info.IsDir() {
			return nil
		}
		if filepath.Ext(path) != ".jsonld" {
			return nil
		}
		// Skip vectors directory
		if strings.Contains(path, "_vectors") {
			return nil
		}

		data, err := os.ReadFile(path)
		if err != nil {
			return nil
		}

		var doc map[string]interface{}
		if err := json.Unmarshal(data, &doc); err != nil {
			return nil
		}

		relPath, _ := filepath.Rel(r.BaseDir, path)

		// Index by @id
		if id, ok := doc["@id"].(string); ok && id != "" {
			r.index.ByID[id] = relPath
		}

		// Index by gh:slug
		if slug, ok := doc["gh:slug"].(string); ok && slug != "" {
			if id, ok := doc["@id"].(string); ok {
				prefix := strings.Split(id, ":")[0]
				r.index.BySlug[prefix+":"+slug] = id
			}
		}

		// Index by gh:actNumber (for acts)
		if actNum, ok := doc["gh:actNumber"].(float64); ok {
			if id, ok := doc["@id"].(string); ok {
				// Extract episode ID from path
				episodeID := extractEpisodeIDFromPath(relPath)
				if episodeID != "" {
					key := fmt.Sprintf("act:%s:%d", episodeID, int(actNum))
					r.index.ByNumber[key] = id
				}
			}
		}

		return nil
	})
}

// Resolve resolves a reference to a Document
// Resolution order: 1. gh:sourceFile → 2. Index lookup → 3. Convention
func (r *HybridResolver) Resolve(ctx Context, ref interface{}) (*Document, error) {
	// 1. Explicit Link (gh:sourceFile)
	if m, ok := ref.(map[string]interface{}); ok {
		if sourceFile, ok := m["gh:sourceFile"].(string); ok {
			return r.resolveSourceFile(ctx, sourceFile)
		}
		// Also check for @id in the map
		if id, ok := m["@id"].(string); ok {
			return r.ResolveByID(ctx, id)
		}
	}

	// 2. String reference (@id)
	if id, ok := ref.(string); ok {
		return r.ResolveByID(ctx, id)
	}

	return nil, fmt.Errorf("cannot resolve reference: %v", ref)
}

// ResolveByID resolves a reference by @id
func (r *HybridResolver) ResolveByID(ctx Context, id string) (*Document, error) {
	// Check cache first
	r.mu.RLock()
	if doc, ok := r.cache[id]; ok {
		r.mu.RUnlock()
		return doc, nil
	}
	r.mu.RUnlock()

	// 1. Try index lookup by ID
	r.mu.RLock()
	if relPath, ok := r.index.ByID[id]; ok {
		r.mu.RUnlock()
		return r.load(filepath.Join(r.BaseDir, relPath))
	}
	r.mu.RUnlock()

	// 2. Try index lookup by slug
	r.mu.RLock()
	if actualID, ok := r.index.BySlug[id]; ok {
		r.mu.RUnlock()
		return r.ResolveByID(ctx, actualID)
	}
	r.mu.RUnlock()

	// 3. Try index lookup by number
	r.mu.RLock()
	if actualID, ok := r.index.ByNumber[id]; ok {
		r.mu.RUnlock()
		return r.ResolveByID(ctx, actualID)
	}
	r.mu.RUnlock()

	// 4. Try convention-based resolution
	return r.resolveByConvention(id)
}

// resolveSourceFile resolves a gh:sourceFile reference
func (r *HybridResolver) resolveSourceFile(ctx Context, sourceFile string) (*Document, error) {
	var basePath string
	if ctx.CurrentFile != "" {
		basePath = filepath.Dir(ctx.CurrentFile)
	} else if ctx.ParentPath != "" {
		basePath = filepath.Dir(ctx.ParentPath)
	} else {
		basePath = r.BaseDir
	}

	fullPath := filepath.Join(basePath, sourceFile)
	// If not found relative to current file, try from BaseDir
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		fullPath = filepath.Join(r.BaseDir, sourceFile)
	}

	return r.load(fullPath)
}

// resolveByConvention tries to resolve using naming conventions
func (r *HybridResolver) resolveByConvention(id string) (*Document, error) {
	for _, rule := range r.conventions {
		if strings.HasPrefix(id, rule.Prefix) {
			name := strings.TrimPrefix(id, rule.Prefix)
			path := filepath.Join(r.BaseDir, fmt.Sprintf(rule.Pattern, name))
			if _, err := os.Stat(path); err == nil {
				return r.load(path)
			}
		}
	}
	return nil, fmt.Errorf("cannot resolve by convention: %s", id)
}

// load reads and parses a JSON-LD file
func (r *HybridResolver) load(path string) (*Document, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read file %s: %w", path, err)
	}

	var docData map[string]interface{}
	if err := json.Unmarshal(data, &docData); err != nil {
		return nil, fmt.Errorf("failed to parse JSON-LD %s: %w", path, err)
	}

	doc := &Document{
		Data:     docData,
		FilePath: path,
	}

	if id, ok := docData["@id"].(string); ok {
		doc.ID = id
	}

	if types, ok := docData["@type"].([]interface{}); ok {
		for _, t := range types {
			if s, ok := t.(string); ok {
				doc.Type = append(doc.Type, s)
			}
		}
	}

	// Cache the document
	if doc.ID != "" {
		r.mu.Lock()
		r.cache[doc.ID] = doc
		r.mu.Unlock()
	}

	return doc, nil
}

// GetIndex returns the current index (for debugging/inspection)
func (r *HybridResolver) GetIndex() *Index {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.index
}

// ClearCache clears the document cache
func (r *HybridResolver) ClearCache() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.cache = make(map[string]*Document)
}

// SaveIndex saves the index to _index.jsonld
func (r *HybridResolver) SaveIndex() error {
	indexDoc := map[string]interface{}{
		"@context": map[string]interface{}{
			"gh": "https://ghosthacker.gftd.ai/ns/",
		},
		"@id":      "gh:resourceIndex",
		"@type":    []string{"gh:Index"},
		"gh:byId":  r.index.ByID,
		"gh:bySlug": r.index.BySlug,
		"gh:byNumber": r.index.ByNumber,
	}

	data, err := json.MarshalIndent(indexDoc, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filepath.Join(r.BaseDir, "_index.jsonld"), data, 0644)
}

// extractEpisodeIDFromPath extracts episode ID from a file path
func extractEpisodeIDFromPath(path string) string {
	// e.g., "episodes/260123-cschool-privacy/acts/act-1.jsonld" → "260123-cschool-privacy"
	// or "episodes/260123-cschool-privacy.act-1.jsonld" → "260123-cschool-privacy"
	parts := strings.Split(path, "/")
	for i, part := range parts {
		if part == "episodes" && i+1 < len(parts) {
			nextPart := parts[i+1]
			// Handle both hierarchical and flat structures
			if strings.Contains(nextPart, ".jsonld") {
				// Flat: "260123-cschool-privacy.act-1.jsonld"
				baseName := strings.TrimSuffix(nextPart, ".jsonld")
				if idx := strings.Index(baseName, ".act-"); idx > 0 {
					return baseName[:idx]
				}
				return baseName
			}
			// Hierarchical: folder name is episode ID
			return nextPart
		}
	}
	return ""
}
