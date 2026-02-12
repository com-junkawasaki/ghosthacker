package index

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/fsnotify/fsnotify"
)

// LiveIndex maintains an in-memory index of JSON-LD documents with file watching
type LiveIndex struct {
	mu       sync.RWMutex
	baseDir  string
	watcher  *fsnotify.Watcher
	stopChan chan struct{}

	// Forward mappings
	IDToPath map[string]string // @id → relative file path
	PathToID map[string]string // relative path → @id

	// Slug and number lookups
	SlugToID   map[string]string // prefix:slug → @id
	NumberToID map[string]string // prefix:parent:number → @id

	// Reference tracking
	Refs     map[string][]string // @id → list of @ids this document references
	BackRefs map[string][]string // @id → list of @ids that reference this document

	// Document metadata cache
	Metadata map[string]*DocumentMeta
}

// DocumentMeta holds extracted metadata for quick access
type DocumentMeta struct {
	ID         string   `json:"@id"`
	Type       []string `json:"@type,omitempty"`
	Slug       string   `json:"gh:slug,omitempty"`
	Title      string   `json:"title,omitempty"`
	Number     int      `json:"number,omitempty"`
	ParentID   string   `json:"parentId,omitempty"`
	References []string `json:"references,omitempty"`
}

// NewLiveIndex creates a new live index with file watching
func NewLiveIndex(baseDir string) (*LiveIndex, error) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}

	idx := &LiveIndex{
		baseDir:    baseDir,
		watcher:    watcher,
		stopChan:   make(chan struct{}),
		IDToPath:   make(map[string]string),
		PathToID:   make(map[string]string),
		SlugToID:   make(map[string]string),
		NumberToID: make(map[string]string),
		Refs:       make(map[string][]string),
		BackRefs:   make(map[string][]string),
		Metadata:   make(map[string]*DocumentMeta),
	}

	// Initial scan
	if err := idx.scan(); err != nil {
		return nil, err
	}

	// Start watching
	go idx.watch()

	// Add directories to watcher
	if err := idx.addWatchDirs(); err != nil {
		log.Printf("Warning: failed to add watch directories: %v", err)
	}

	return idx, nil
}

// scan performs initial indexing of all JSON-LD files
func (idx *LiveIndex) scan() error {
	return filepath.Walk(idx.baseDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info.IsDir() {
			return nil
		}
		if filepath.Ext(path) != ".jsonld" {
			return nil
		}
		// Skip vectors and index files
		if strings.Contains(path, "_vectors") || strings.Contains(path, "_index") {
			return nil
		}

		idx.indexFile(path)
		return nil
	})
}

// indexFile indexes a single JSON-LD file
func (idx *LiveIndex) indexFile(path string) {
	data, err := os.ReadFile(path)
	if err != nil {
		log.Printf("Failed to read %s: %v", path, err)
		return
	}

	var doc map[string]interface{}
	if err := json.Unmarshal(data, &doc); err != nil {
		log.Printf("Failed to parse %s: %v", path, err)
		return
	}

	relPath, _ := filepath.Rel(idx.baseDir, path)

	idx.mu.Lock()
	defer idx.mu.Unlock()

	// Extract @id
	id, _ := doc["@id"].(string)
	if id == "" {
		return
	}

	// Update forward mappings
	idx.IDToPath[id] = relPath
	idx.PathToID[relPath] = id

	// Extract metadata
	meta := &DocumentMeta{ID: id}

	// @type
	if types, ok := doc["@type"].([]interface{}); ok {
		for _, t := range types {
			if s, ok := t.(string); ok {
				meta.Type = append(meta.Type, s)
			}
		}
	}

	// gh:slug
	if slug, ok := doc["gh:slug"].(string); ok {
		meta.Slug = slug
		prefix := strings.Split(id, ":")[0]
		idx.SlugToID[prefix+":"+slug] = id
	}

	// Title (various fields)
	if title, ok := doc["dct:title"].(string); ok {
		meta.Title = title
	} else if title, ok := doc["schema:name"].(string); ok {
		meta.Title = title
	} else if title, ok := doc["gh:actTitle"].(string); ok {
		meta.Title = title
	}

	// gh:actNumber or gh:episodeIndex
	if num, ok := doc["gh:actNumber"].(float64); ok {
		meta.Number = int(num)
		// Create number-based key
		episodeID := extractEpisodeID(relPath)
		if episodeID != "" {
			meta.ParentID = episodeID
			key := formatNumberKey("act", episodeID, meta.Number)
			idx.NumberToID[key] = id
		}
	}

	// Extract references
	refs := extractReferences(doc)
	meta.References = refs
	idx.Refs[id] = refs

	// Update back references
	for _, refID := range refs {
		idx.BackRefs[refID] = appendUnique(idx.BackRefs[refID], id)
	}

	idx.Metadata[id] = meta
}

// removeFile removes a file from the index
func (idx *LiveIndex) removeFile(path string) {
	relPath, _ := filepath.Rel(idx.baseDir, path)

	idx.mu.Lock()
	defer idx.mu.Unlock()

	id, ok := idx.PathToID[relPath]
	if !ok {
		return
	}

	// Remove from forward mappings
	delete(idx.IDToPath, id)
	delete(idx.PathToID, relPath)

	// Remove from slug/number mappings
	if meta, ok := idx.Metadata[id]; ok {
		if meta.Slug != "" {
			prefix := strings.Split(id, ":")[0]
			delete(idx.SlugToID, prefix+":"+meta.Slug)
		}
		if meta.Number > 0 && meta.ParentID != "" {
			key := formatNumberKey("act", meta.ParentID, meta.Number)
			delete(idx.NumberToID, key)
		}
	}

	// Remove from refs
	if refs, ok := idx.Refs[id]; ok {
		for _, refID := range refs {
			idx.BackRefs[refID] = removeFromSlice(idx.BackRefs[refID], id)
		}
	}
	delete(idx.Refs, id)

	// Remove metadata
	delete(idx.Metadata, id)
}

// watch handles file system events
func (idx *LiveIndex) watch() {
	for {
		select {
		case event, ok := <-idx.watcher.Events:
			if !ok {
				return
			}
			if filepath.Ext(event.Name) != ".jsonld" {
				continue
			}
			if strings.Contains(event.Name, "_vectors") || strings.Contains(event.Name, "_index") {
				continue
			}

			switch {
			case event.Op&fsnotify.Write == fsnotify.Write:
				log.Printf("LiveIndex: file modified: %s", event.Name)
				idx.indexFile(event.Name)
			case event.Op&fsnotify.Create == fsnotify.Create:
				log.Printf("LiveIndex: file created: %s", event.Name)
				idx.indexFile(event.Name)
			case event.Op&fsnotify.Remove == fsnotify.Remove:
				log.Printf("LiveIndex: file removed: %s", event.Name)
				idx.removeFile(event.Name)
			case event.Op&fsnotify.Rename == fsnotify.Rename:
				log.Printf("LiveIndex: file renamed: %s", event.Name)
				idx.removeFile(event.Name)
			}

		case err, ok := <-idx.watcher.Errors:
			if !ok {
				return
			}
			log.Printf("LiveIndex: watcher error: %v", err)

		case <-idx.stopChan:
			return
		}
	}
}

// addWatchDirs adds all relevant directories to the watcher
func (idx *LiveIndex) addWatchDirs() error {
	return filepath.Walk(idx.baseDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if !info.IsDir() {
			return nil
		}
		// Skip hidden and special directories
		if strings.HasPrefix(filepath.Base(path), ".") {
			return filepath.SkipDir
		}
		if strings.Contains(path, "_vectors") || strings.Contains(path, "_index") {
			return filepath.SkipDir
		}

		if err := idx.watcher.Add(path); err != nil {
			log.Printf("Warning: failed to watch %s: %v", path, err)
		}
		return nil
	})
}

// Stop stops the file watcher
func (idx *LiveIndex) Stop() {
	close(idx.stopChan)
	idx.watcher.Close()
}

// GetPath returns the file path for a given @id
func (idx *LiveIndex) GetPath(id string) string {
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	return idx.IDToPath[id]
}

// GetID returns the @id for a given file path
func (idx *LiveIndex) GetID(relPath string) string {
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	return idx.PathToID[relPath]
}

// ResolveSlug resolves a slug to @id
func (idx *LiveIndex) ResolveSlug(slug string) string {
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	return idx.SlugToID[slug]
}

// ResolveNumber resolves a number-based key to @id
func (idx *LiveIndex) ResolveNumber(key string) string {
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	return idx.NumberToID[key]
}

// GetBackRefs returns all documents that reference the given @id
func (idx *LiveIndex) GetBackRefs(id string) []string {
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	result := make([]string, len(idx.BackRefs[id]))
	copy(result, idx.BackRefs[id])
	return result
}

// GetRefs returns all @ids that the given document references
func (idx *LiveIndex) GetRefs(id string) []string {
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	result := make([]string, len(idx.Refs[id]))
	copy(result, idx.Refs[id])
	return result
}

// GetMetadata returns metadata for a given @id
func (idx *LiveIndex) GetMetadata(id string) *DocumentMeta {
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	if meta, ok := idx.Metadata[id]; ok {
		return meta
	}
	return nil
}

// ListByType returns all @ids of a given type prefix (e.g., "character", "episode")
func (idx *LiveIndex) ListByType(prefix string) []string {
	idx.mu.RLock()
	defer idx.mu.RUnlock()

	var result []string
	fullPrefix := prefix + ":"
	for id := range idx.IDToPath {
		if strings.HasPrefix(id, fullPrefix) {
			result = append(result, id)
		}
	}
	return result
}

// Rebuild forces a complete re-index
func (idx *LiveIndex) Rebuild() error {
	idx.mu.Lock()
	idx.IDToPath = make(map[string]string)
	idx.PathToID = make(map[string]string)
	idx.SlugToID = make(map[string]string)
	idx.NumberToID = make(map[string]string)
	idx.Refs = make(map[string][]string)
	idx.BackRefs = make(map[string][]string)
	idx.Metadata = make(map[string]*DocumentMeta)
	idx.mu.Unlock()

	return idx.scan()
}

// SaveToFile saves the index to _index.jsonld
func (idx *LiveIndex) SaveToFile() error {
	idx.mu.RLock()
	defer idx.mu.RUnlock()

	indexDoc := map[string]interface{}{
		"@context": map[string]interface{}{
			"gh": "https://ghosthacker.gftd.ai/ns/",
		},
		"@id":         "gh:resourceIndex",
		"@type":       []string{"gh:Index"},
		"gh:byId":     idx.IDToPath,
		"gh:bySlug":   idx.SlugToID,
		"gh:byNumber": idx.NumberToID,
		"gh:metadata": idx.Metadata,
	}

	data, err := json.MarshalIndent(indexDoc, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filepath.Join(idx.baseDir, "_index.jsonld"), data, 0644)
}

// Helper functions

func extractEpisodeID(relPath string) string {
	parts := strings.Split(relPath, "/")
	for i, part := range parts {
		if part == "episodes" && i+1 < len(parts) {
			nextPart := parts[i+1]
			if strings.Contains(nextPart, ".jsonld") {
				baseName := strings.TrimSuffix(nextPart, ".jsonld")
				if idx := strings.Index(baseName, ".act-"); idx > 0 {
					return baseName[:idx]
				}
				return baseName
			}
			return nextPart
		}
	}
	return ""
}

func formatNumberKey(prefix, parentID string, number int) string {
	return prefix + ":" + parentID + ":" + string(rune('0'+number))
}

func extractReferences(doc map[string]interface{}) []string {
	var refs []string
	extractRefsRecursive(doc, &refs)
	return refs
}

func extractRefsRecursive(v interface{}, refs *[]string) {
	switch val := v.(type) {
	case map[string]interface{}:
		// Check for @id reference
		if id, ok := val["@id"].(string); ok {
			*refs = appendUnique(*refs, id)
		}
		// Check for character/environment references
		for key, value := range val {
			if key == "characters" || key == "environment" || key == "speaker" {
				extractRefsRecursive(value, refs)
			} else if strings.HasPrefix(key, "gh:") || strings.HasPrefix(key, "@") {
				extractRefsRecursive(value, refs)
			}
		}
	case []interface{}:
		for _, item := range val {
			extractRefsRecursive(item, refs)
		}
	case string:
		// Check if it looks like a reference (contains ":")
		if strings.Contains(val, ":") && !strings.HasPrefix(val, "http") {
			*refs = appendUnique(*refs, val)
		}
	}
}

func appendUnique(slice []string, item string) []string {
	for _, s := range slice {
		if s == item {
			return slice
		}
	}
	return append(slice, item)
}

func removeFromSlice(slice []string, item string) []string {
	result := make([]string, 0, len(slice))
	for _, s := range slice {
		if s != item {
			result = append(result, s)
		}
	}
	return result
}
