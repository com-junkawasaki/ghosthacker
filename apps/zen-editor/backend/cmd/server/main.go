package main

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"connectrpc.com/connect"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	_ "modernc.org/sqlite"

	"github.com/google/uuid"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"github.com/gftd-ai/ghost-hacker/apps/zen-editor/backend/internal/git"
	editorpb "github.com/gftd-ai/ghost-hacker/apps/zen-editor/backend/proto"
	"github.com/gftd-ai/ghost-hacker/apps/zen-editor/backend/proto/editorpbconnect"
)

type EditorServer struct {
	WorkspaceRoot string
	MCPServer     *server.MCPServer
	NodeEmotions  map[string]map[string]float32
	ToolHandlers  map[string]func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error)
	DB            *sql.DB
	Git           *git.GitService

	// Memory Store for fast access
	mu               sync.RWMutex
	currentProjectID string
	NodeCache        map[string]*editorpb.Node
	EdgeCache        []*editorpb.Edge
}

func (s *EditorServer) idToFilename(id string) string {
	encoded := base64.URLEncoding.EncodeToString([]byte(id))
	return encoded + ".jsonld"
}

func (s *EditorServer) filenameToId(filename string) string {
	base := strings.TrimSuffix(filename, ".jsonld")
	decoded, _ := base64.URLEncoding.DecodeString(base)
	return string(decoded)
}

func (s *EditorServer) LoadDatastore(projectID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	s.currentProjectID = projectID
	datastoreDir := filepath.Join(s.WorkspaceRoot, projectID, "datastore")
	os.MkdirAll(datastoreDir, 0755)

	s.NodeCache = make(map[string]*editorpb.Node)
	s.EdgeCache = nil

	// Helper to load files from a directory
	var loadFromDir func(dir string)
	loadFromDir = func(dir string) {
		entries, err := os.ReadDir(dir)
		if err != nil {
			log.Printf("Warning: failed to read directory %s: %v", dir, err)
			return
		}

		for _, e := range entries {
			fullPath := filepath.Join(dir, e.Name())
			if e.IsDir() {
				loadFromDir(fullPath)
				continue
			}
			if !strings.HasSuffix(e.Name(), ".jsonld") {
				continue
			}
			
			data, err := os.ReadFile(fullPath)
			if err != nil { continue }

			var nodeData map[string]interface{}
			if err := json.Unmarshal(data, &nodeData); err != nil { continue }

			id, _ := nodeData["@id"].(string)
			if id == "" { continue }

			var nodeType string
			if t, ok := nodeData["@type"].(string); ok {
				nodeType = t
			} else if ts, ok := nodeData["@type"].([]interface{}); ok && len(ts) > 0 {
				nodeType, _ = ts[0].(string)
			}
			
			label, _ := nodeData["name"].(string)
			if label == "" { label, _ = nodeData["label"].(string) }
			group := s.categorizeNode(nodeType)
			
			node := &editorpb.Node{
				Id:       id,
				Label:    label,
				Type:     nodeType,
				Group:    group,
				ViewType: s.determineViewType(id, nodeType, group),
			}

			// 3D properties
			if gltf, ok := nodeData["gh:gltfPath"].(string); ok {
				node.GltfPath = gltf
			}
			if pos, ok := nodeData["gh:position3d"].([]interface{}); ok && len(pos) == 3 {
				node.Position3D = []float32{float32(pos[0].(float64)), float32(pos[1].(float64)), float32(pos[2].(float64))}
			}
			if rot, ok := nodeData["gh:rotation3d"].([]interface{}); ok && len(rot) == 3 {
				node.Rotation3D = []float32{float32(rot[0].(float64)), float32(rot[1].(float64)), float32(rot[2].(float64))}
			}
			if scale, ok := nodeData["gh:scale3d"].([]interface{}); ok && len(scale) == 3 {
				node.Scale3D = []float32{float32(scale[0].(float64)), float32(scale[1].(float64)), float32(scale[2].(float64))}
			}

			if desc, ok := nodeData["description"].(string); ok { node.Content = desc }
			if content, ok := nodeData["gh:content"].(map[string]interface{}); ok {
				node.LocalizedContent = make(map[string]string)
				for k, v := range content { node.LocalizedContent[k] = v.(string) }
				if node.Content == "" { node.Content = node.LocalizedContent["ja"] }
			}

			s.NodeCache[id] = node

			// Extract relations recursively
			var extractEdges func(string, interface{})
			extractEdges = func(fromID string, v interface{}) {
				switch val := v.(type) {
				case map[string]interface{}:
					if targetID, ok := val["@id"].(string); ok && targetID != "" && targetID != fromID {
						s.EdgeCache = append(s.EdgeCache, &editorpb.Edge{
							FromId: fromID, ToId: targetID, Relation: "gh:relatesTo", Group: "semantic",
						})
					}
					for k, subV := range val {
						if k == "@context" {
							continue
						}
						extractEdges(fromID, subV)
					}
				case []interface{}:
					for _, subV := range val {
						extractEdges(fromID, subV)
					}
				}
			}

			for k, v := range nodeData {
				if k == "@id" || k == "@type" || k == "gh:x" || k == "gh:y" { continue }
				if k == "gh:contains" || k == "gh:participants" || k == "gh:involvedIn" || k == "gh:memberOf" {
					if items, ok := v.([]interface{}); ok {
						for _, item := range items {
							targetID := ""
							if s, ok := item.(string); ok { targetID = s }
							if m, ok := item.(map[string]interface{}); ok { targetID, _ = m["@id"].(string) }
							if targetID != "" && targetID != id {
								rel := k
								if k == "gh:participants" { rel = "gh:relatesTo" }
								group := "structural"
								if rel == "gh:relatesTo" { group = "semantic" }
								s.EdgeCache = append(s.EdgeCache, &editorpb.Edge{
									FromId: id, ToId: targetID, Relation: rel, Group: group,
								})
							}
						}
					}
				} else {
					extractEdges(id, v)
				}
			}
		}
	}

	// Load from datastore and other predefined directories
	loadFromDir(datastoreDir)
	loadFromDir(filepath.Join(s.WorkspaceRoot, projectID, "props"))
	loadFromDir(filepath.Join(s.WorkspaceRoot, projectID, "environments"))

	log.Printf("Loaded %d nodes and %d edges from datastore for %s", len(s.NodeCache), len(s.EdgeCache), projectID)
}

func (s *EditorServer) DeepFlattenDatastore(projectID string) {
	datastoreDir := filepath.Join(s.WorkspaceRoot, projectID, "datastore")
	os.MkdirAll(datastoreDir, 0755)

	log.Printf("Starting deep flattening for project %s into %s", projectID, datastoreDir)

	// Helper to save a single node
	saveNode := func(id string, data map[string]interface{}) {
		filename := s.idToFilename(id)
		path := filepath.Join(datastoreDir, filename)
		jsonData, _ := json.MarshalIndent(data, "", "  ")
		os.WriteFile(path, jsonData, 0644)
	}

	// 1. Migrate ghost-hacker.jsonld (World Graph)
	ghPath := filepath.Join(s.WorkspaceRoot, projectID, "ghost-hacker.jsonld")
	if data, err := os.ReadFile(ghPath); err == nil {
		var g struct { Graph []map[string]interface{} `json:"@graph"` }
		json.Unmarshal(data, &g)
		for _, item := range g.Graph {
			if id, ok := item["@id"].(string); ok {
				saveNode(id, item)
			}
		}
	}

	// 2. Migrate Wattpad manuscripts and blocks
	wattpadRoot := filepath.Join(s.WorkspaceRoot, projectID, "wattpad")
	filepath.Walk(wattpadRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || !strings.HasSuffix(info.Name(), ".jsonld") {
			return nil
		}

		data, _ := os.ReadFile(path)
		var nodeData map[string]interface{}
		if err := json.Unmarshal(data, &nodeData); err != nil { return nil }

		if id, ok := nodeData["@id"].(string); ok {
			saveNode(id, nodeData)
		}
		return nil
	})

	log.Printf("Deep flattening complete for %s", projectID)
}

func NewEditorServer(dataRoot string) *EditorServer {
	dbPath := filepath.Join(dataRoot, "..", "zen-editor.db")
	db, _ := sql.Open("sqlite", dbPath)
	db.Exec(`CREATE TABLE IF NOT EXISTS history (id TEXT PRIMARY KEY, project_id TEXT, parent_id TEXT, branch_name TEXT, type TEXT, state_json TEXT, message TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`)

	s := &EditorServer{
		WorkspaceRoot: dataRoot,
		MCPServer:     server.NewMCPServer("GhostHackerEditor", "1.0.0"),
		NodeEmotions:  initNodeEmotions(),
		ToolHandlers:  make(map[string]func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error)),
		DB:            db,
		Git:           git.NewGitService(dataRoot),
		NodeCache:     make(map[string]*editorpb.Node),
	}
	s.registerMCPTools()
	
	// Initial project load
	projectID := "251121"
	datastoreDir := filepath.Join(s.WorkspaceRoot, projectID, "datastore")
	if _, err := os.Stat(datastoreDir); os.IsNotExist(err) {
		s.DeepFlattenDatastore(projectID)
	}
	s.LoadDatastore(projectID)

	return s
}

func (s *EditorServer) GetTopology(ctx context.Context, req *connect.Request[editorpb.GetTopologyRequest]) (*connect.Response[editorpb.GetTopologyResponse], error) {
	log.Printf("RPC: GetTopology (MemoryStore) called for: %s", req.Msg.ProjectId)
	
	s.mu.RLock()
	needsLoad := s.currentProjectID != req.Msg.ProjectId || len(s.NodeCache) == 0
	s.mu.RUnlock()

	if needsLoad {
		s.LoadDatastore(req.Msg.ProjectId)
	}
	
	s.mu.RLock()
	defer s.mu.RUnlock()

	resp := &editorpb.GetTopologyResponse{}
	hubs := make(map[string]*editorpb.Node)
	connected := make(map[string]bool)

	// Pre-identify connected nodes
	for _, edge := range s.EdgeCache {
		connected[edge.FromId] = true
		connected[edge.ToId] = true
	}

	// First pass: Add regular nodes and identify needed hubs
	for _, node := range s.NodeCache {
		// Filter out blocks and other noise for the high-level topology
		if node.Type == "gh:Block" || strings.HasPrefix(node.Id, "block:") {
			continue
		}
		
		nodeCopy := *node
		nodeCopy.Children = nil // Reset children for response
		
		group := nodeCopy.Group
		
		// If not connected to anything else, put in unlinked
		if !connected[nodeCopy.Id] {
			group = "unlinked"
			nodeCopy.Group = "unlinked"
		}
		
		resp.Nodes = append(resp.Nodes, &nodeCopy)
		if group != "" && group != "meta" && group != "link-node" {
			hubID := "hub:" + group
			if _, ok := hubs[hubID]; !ok {
				hLabel := strings.Title(group) + " Circle"
				if group == "unlinked" { hLabel = "Unlinked Circle" }
				if group == "content" { hLabel = "Story Circle" }
				
				hubs[hubID] = &editorpb.Node{
					Id: hubID, Label: hLabel, Type: "gh:ClusterHub", Group: "meta",
					ViewType: s.determineViewType(hubID, "gh:ClusterHub", "meta"),
				}
			}
		}
	}
	
	// Add hubs to response
	for _, hub := range hubs {
		resp.Nodes = append(resp.Nodes, hub)
	}

	// Create a map for quick access during edge/children building
	nodeMap := make(map[string]*editorpb.Node)
	for _, n := range resp.Nodes { nodeMap[n.Id] = n }

	// Build containment edges and populate children
	for _, node := range resp.Nodes {
		if node.Group != "" && node.Group != "meta" && node.Group != "link-node" {
			hubID := "hub:" + node.Group
			if hub, ok := nodeMap[hubID]; ok {
				hub.Children = append(hub.Children, node.Id)
				resp.Edges = append(resp.Edges, &editorpb.Edge{
					FromId: hubID, ToId: node.Id, Relation: "gh:memberOf", Group: "structural",
				})
			}
		}
	}

	// Add semantic edges from cache and populate children for other relations
	for _, edge := range s.EdgeCache {
		if from, ok := nodeMap[edge.FromId]; ok {
			if _, ok := nodeMap[edge.ToId]; ok {
				resp.Edges = append(resp.Edges, edge)
				// Use specific relations to build hierarchy in the sidebar
				if edge.Relation == "gh:contains" || edge.Relation == "gh:partOf" || edge.Relation == "gh:memberOf" {
					found := false
					for _, c := range from.Children {
						if c == edge.ToId { found = true; break }
					}
					if !found {
						from.Children = append(from.Children, edge.ToId)
					}
				}
			}
		}
	}

	log.Printf("RPC: GetTopology returning %d nodes and %d edges", len(resp.Nodes), len(resp.Edges))
	return connect.NewResponse(resp), nil
}

func (s *EditorServer) GetBlocks(ctx context.Context, req *connect.Request[editorpb.GetBlocksRequest]) (*connect.Response[editorpb.GetBlocksResponse], error) {
	log.Printf("RPC: GetBlocks (MemoryStore) called for: %s", req.Msg.ManuscriptId)
	resp := &editorpb.GetBlocksResponse{}
	if len(s.NodeCache) == 0 { s.LoadDatastore(req.Msg.ProjectId) }
	
	s.mu.RLock()
	defer s.mu.RUnlock()

	var manuscriptBlocks []*editorpb.Node
	for _, edge := range s.EdgeCache {
		if edge.FromId == req.Msg.ManuscriptId && edge.Relation == "gh:contains" {
			if node, ok := s.NodeCache[edge.ToId]; ok {
				nodeCopy := *node
				nodeCopy.Children = nil
				manuscriptBlocks = append(manuscriptBlocks, &nodeCopy)
			}
		}
	}
	sort.Slice(manuscriptBlocks, func(i, j int) bool { return manuscriptBlocks[i].Id < manuscriptBlocks[j].Id })
	
	resp.Nodes = manuscriptBlocks
	for i := 0; i < len(manuscriptBlocks); i++ {
		resp.Edges = append(resp.Edges, &editorpb.Edge{FromId: req.Msg.ManuscriptId, ToId: manuscriptBlocks[i].Id, Relation: "gh:contains", Group: "structural"})
		if i > 0 {
			resp.Edges = append(resp.Edges, &editorpb.Edge{FromId: manuscriptBlocks[i-1].Id, ToId: manuscriptBlocks[i].Id, Relation: "gh:precedes", Group: "structural"})
		}
	}
	return connect.NewResponse(resp), nil
}

func (s *EditorServer) SaveManuscript(ctx context.Context, req *connect.Request[editorpb.SaveManuscriptRequest]) (*connect.Response[editorpb.SaveManuscriptResponse], error) {
	log.Printf("RPC: SaveManuscript (Datastore) called for: %s", req.Msg.ManuscriptId)
	datastoreDir := filepath.Join(s.WorkspaceRoot, req.Msg.ProjectId, "datastore")
	for i, b := range req.Msg.Blocks {
		localized := b.LocalizedContent
		if len(localized) == 0 { localized = map[string]string{"ja": b.Content} }
		blockData := map[string]interface{}{
			"@context": map[string]interface{}{ "gh": "https://gftd.ai/ghost-hacker/ontology/", "content": "gh:content" },
			"@id": b.Id, "@type": "gh:Block", "gh:index": i, "gh:content": localized, "gh:viewType": "editor",
		}
		data, _ := json.MarshalIndent(blockData, "", "  ")
		os.WriteFile(filepath.Join(datastoreDir, s.idToFilename(b.Id)), data, 0644)
	}
	s.LoadDatastore(req.Msg.ProjectId)
	return connect.NewResponse(&editorpb.SaveManuscriptResponse{Success: true, Message: "Saved to Datastore"}), nil
}

func (s *EditorServer) determineViewType(id, nodeType, group string) string {
	if id == "hub:translation" { return "translation" }
	if group == "unlinked" { return "connection-suggester" }
	switch {
	case nodeType == "gh:Manuscript" || nodeType == "gh:Block": return "editor"
	case strings.Contains(nodeType, "Person") || strings.Contains(nodeType, "Character") || strings.Contains(nodeType, "Place"): return "entity"
	case nodeType == "gh:RelationEvent": return "relation"
	case strings.Contains(nodeType, "Image") || strings.Contains(nodeType, "Asset"): return "asset"
	case nodeType == "gh:Storyboard": return "storyboard"
	}
	return "storyboard"
}

func (s *EditorServer) categorizeNode(t string) string {
	switch {
	case t == "gh:RelationEvent": return "link-node"
	case strings.Contains(t, "Person") || strings.Contains(t, "Character"): return "entity"
	case strings.Contains(t, "Place") || strings.Contains(t, "Setting") || strings.Contains(t, "Environment"): return "environment"
	case strings.Contains(t, "Item") || strings.Contains(t, "Object") || strings.Contains(t, "Product") || strings.Contains(t, "Prop"): return "item"
	case strings.Contains(t, "Emotion") || strings.Contains(t, "Sentiment"): return "emotion"
	case strings.Contains(t, "Manuscript") || strings.Contains(t, "Block") || strings.Contains(t, "Episode"): return "content"
	case strings.Contains(t, "Image") || strings.Contains(t, "Asset") || strings.Contains(t, "ImageObject"): return "asset"
	default: return "concept"
	}
}

func (s *EditorServer) generateDummyEmbedding(id string) []float32 {
	embedding := make([]float32, 16)
	sum := 0
	for _, char := range id { sum += int(char) }
	for i := range embedding { embedding[i] = float32((sum * (i + 1)) % 100) / 100.0 }
	return embedding
}

func initNodeEmotions() map[string]map[string]float32 {
	return map[string]map[string]float32{
		"character:tamaki": {"Calm": 0.8, "Joy": 0.2, "Neutral": 0.9},
	}
}

func (s *EditorServer) Interact(ctx context.Context, req *connect.Request[editorpb.InteractRequest], stream *connect.ServerStream[editorpb.InteractResponse]) error {
	log.Printf("RPC: Interact called for: %v", req.Msg.NodeIds)
	return nil // Simplified for now
}

func (s *EditorServer) GetProjectMetadata(ctx context.Context, req *connect.Request[editorpb.GetProjectMetadataRequest]) (*connect.Response[editorpb.GetProjectMetadataResponse], error) {
	projectID := req.Msg.ProjectId
	projectDir := filepath.Join(s.WorkspaceRoot, projectID)
	
	resp := &editorpb.GetProjectMetadataResponse{
		Title: projectID,
	}

	// Try to load PROJECT.jsonld for title/description
	projectFile := filepath.Join(projectDir, "PROJECT.jsonld")
	if data, err := os.ReadFile(projectFile); err == nil {
		var meta struct {
			Name        string `json:"name"`
			Description string `json:"description"`
		}
		json.Unmarshal(data, &meta)
		if meta.Name != "" { resp.Title = meta.Name }
		resp.Description = meta.Description
	}

	// List files in the project directory
	filepath.Walk(projectDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() { return nil }
		relPath, _ := filepath.Rel(s.WorkspaceRoot, path)
		// Basic categorization into "episodes" or just list them
		// For now, let's put everything in one virtual episode
		if len(resp.Episodes) == 0 {
			resp.Episodes = append(resp.Episodes, &editorpb.Episode{Id: "files", Title: "Project Files"})
		}
		resp.Episodes[0].Files = append(resp.Episodes[0].Files, relPath)
		return nil
	})

	return connect.NewResponse(resp), nil
}

func (s *EditorServer) OpenFile(ctx context.Context, req *connect.Request[editorpb.OpenFileRequest]) (*connect.Response[editorpb.OpenFileResponse], error) {
	log.Printf("RPC: OpenFile called for: %s", req.Msg.Path)
	fullPath := filepath.Join(s.WorkspaceRoot, req.Msg.Path)
	
	// Security check
	cleanBase := filepath.Clean(s.WorkspaceRoot)
	cleanFull := filepath.Clean(fullPath)
	if !strings.HasPrefix(cleanFull, cleanBase) {
		return nil, connect.NewError(connect.CodePermissionDenied, fmt.Errorf("access denied"))
	}

	data, err := os.ReadFile(fullPath)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&editorpb.OpenFileResponse{Content: string(data)}), nil
}

func (s *EditorServer) SaveFile(ctx context.Context, req *connect.Request[editorpb.SaveFileRequest]) (*connect.Response[editorpb.SaveFileResponse], error) {
	log.Printf("RPC: SaveFile called for: %s", req.Msg.Path)
	fullPath := filepath.Join(s.WorkspaceRoot, req.Msg.Path)
	
	// Security check
	cleanBase := filepath.Clean(s.WorkspaceRoot)
	cleanFull := filepath.Clean(fullPath)
	if !strings.HasPrefix(cleanFull, cleanBase) {
		return nil, connect.NewError(connect.CodePermissionDenied, fmt.Errorf("access denied"))
	}

	err := os.MkdirAll(filepath.Dir(fullPath), 0755)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	err = os.WriteFile(fullPath, []byte(req.Msg.Content), 0644)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&editorpb.SaveFileResponse{Success: true}), nil
}

func (s *EditorServer) SaveStoryboard(ctx context.Context, req *connect.Request[editorpb.SaveStoryboardRequest]) (*connect.Response[editorpb.SaveStoryboardResponse], error) {
	log.Printf("RPC: SaveStoryboard called for: %s", req.Msg.ProjectId)
	datastoreDir := filepath.Join(s.WorkspaceRoot, req.Msg.ProjectId, "datastore")
	os.MkdirAll(datastoreDir, 0755)

	storyboardData := map[string]interface{}{
		"@context": map[string]interface{}{
			"gh": "https://gftd.ai/ghost-hacker/ontology/",
			"scenes": "gh:scenes",
		},
		"@id": "storyboard:" + req.Msg.ProjectId,
		"@type": "gh:Storyboard",
		"gh:scenes": req.Msg.Scenes,
	}

	data, err := json.MarshalIndent(storyboardData, "", "  ")
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	filename := s.idToFilename("storyboard:" + req.Msg.ProjectId)
	err = os.WriteFile(filepath.Join(datastoreDir, filename), data, 0644)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	s.LoadDatastore(req.Msg.ProjectId)
	return connect.NewResponse(&editorpb.SaveStoryboardResponse{Success: true, Message: "Saved to Datastore"}), nil
}

func (s *EditorServer) GetStoryboard(ctx context.Context, req *connect.Request[editorpb.GetStoryboardRequest]) (*connect.Response[editorpb.GetStoryboardResponse], error) {
	log.Printf("RPC: GetStoryboard called for: %s", req.Msg.ProjectId)
	id := "storyboard:" + req.Msg.ProjectId
	
	if len(s.NodeCache) == 0 { s.LoadDatastore(req.Msg.ProjectId) }
	
	datastoreDir := filepath.Join(s.WorkspaceRoot, req.Msg.ProjectId, "datastore")
	path := filepath.Join(datastoreDir, s.idToFilename(id))
	
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return connect.NewResponse(&editorpb.GetStoryboardResponse{}), nil
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var storyboardData struct {
		Scenes []*editorpb.StoryboardScene `json:"gh:scenes"`
	}
	if err := json.Unmarshal(data, &storyboardData); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&editorpb.GetStoryboardResponse{Scenes: storyboardData.Scenes}), nil
}

func (s *EditorServer) CommitHistory(ctx context.Context, req *connect.Request[editorpb.CommitHistoryRequest]) (*connect.Response[editorpb.CommitHistoryResponse], error) {
	id := uuid.New().String()
	return connect.NewResponse(&editorpb.CommitHistoryResponse{Id: id, Success: true}), nil
}

func (s *EditorServer) GetHistory(ctx context.Context, req *connect.Request[editorpb.GetHistoryRequest]) (*connect.Response[editorpb.GetHistoryResponse], error) {
	return connect.NewResponse(&editorpb.GetHistoryResponse{}), nil
}

func (s *EditorServer) CheckoutHistory(ctx context.Context, req *connect.Request[editorpb.CheckoutHistoryRequest]) (*connect.Response[editorpb.CheckoutHistoryResponse], error) {
	return connect.NewResponse(&editorpb.CheckoutHistoryResponse{Success: true}), nil
}

func (s *EditorServer) CallTool(ctx context.Context, req *connect.Request[editorpb.CallToolRequest]) (*connect.Response[editorpb.CallToolResponse], error) {
		return connect.NewResponse(&editorpb.CallToolResponse{IsError: true, ResultJson: `{"error": "tool not found"}`}), nil
	}

func (s *EditorServer) registerMCPTools() {}

func withCORS(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Connect-Protocol-Version")
		if r.Method == "OPTIONS" { w.WriteHeader(http.StatusNoContent); return }
		h.ServeHTTP(w, r)
	})
}

func (s *EditorServer) SaveNode(ctx context.Context, req *connect.Request[editorpb.SaveNodeRequest]) (*connect.Response[editorpb.SaveNodeResponse], error) {
	log.Printf("RPC: SaveNode called for: %s (project: %s)", req.Msg.Node.Id, req.Msg.ProjectId)
	datastoreDir := filepath.Join(s.WorkspaceRoot, req.Msg.ProjectId, "datastore")
	os.MkdirAll(datastoreDir, 0755)

	node := req.Msg.Node
	filename := s.idToFilename(node.Id)
	path := filepath.Join(datastoreDir, filename)

	// Load existing data if available to preserve extra fields
	nodeData := make(map[string]interface{})
	if data, err := os.ReadFile(path); err == nil {
		json.Unmarshal(data, &nodeData)
	}

	// Update fields from request
	nodeData["@id"] = node.Id
	nodeData["@type"] = node.Type
	nodeData["name"] = node.Label
	nodeData["description"] = node.Content
	nodeData["gh:gltfPath"] = node.GltfPath
	if len(node.Position3D) == 3 {
		nodeData["gh:position3d"] = []float32{node.Position3D[0], node.Position3D[1], node.Position3D[2]}
	}
	if len(node.Rotation3D) == 3 {
		nodeData["gh:rotation3d"] = []float32{node.Rotation3D[0], node.Rotation3D[1], node.Rotation3D[2]}
	}
	if len(node.Scale3D) == 3 {
		nodeData["gh:scale3d"] = []float32{node.Scale3D[0], node.Scale3D[1], node.Scale3D[2]}
	}

	data, _ := json.MarshalIndent(nodeData, "", "  ")
	err := os.WriteFile(path, data, 0644)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	s.LoadDatastore(req.Msg.ProjectId)
	return connect.NewResponse(&editorpb.SaveNodeResponse{Success: true, Message: "Node saved to Datastore"}), nil
}

func main() {
	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = "data" // Default to relative data directory
	}
	
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := NewEditorServer(workspaceRoot)
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("OK")) })
	
	// Serve data directory as static files
	mux.Handle("/data/", http.StripPrefix("/data/", http.FileServer(http.Dir(workspaceRoot))))

	path, handler := editorpbconnect.NewEditorServiceHandler(srv)
	mux.Handle(path, handler)
	
	// Apply CORS to everything
	handlerWithCORS := withCORS(mux)
	
	log.Printf("Starting server on :%s (workspace: %s)", port, workspaceRoot)
	http.ListenAndServe(":"+port, h2c.NewHandler(handlerWithCORS, &http2.Server{}))
}
