package main

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"

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
	NodeCache map[string]*editorpb.Node
	EdgeCache []*editorpb.Edge
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
	datastoreDir := filepath.Join(s.WorkspaceRoot, projectID, "datastore")
	os.MkdirAll(datastoreDir, 0755)

	s.NodeCache = make(map[string]*editorpb.Node)
	s.EdgeCache = nil

	entries, err := os.ReadDir(datastoreDir)
	if err != nil {
		log.Printf("Error reading datastore: %v", err)
		return
	}

	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".jsonld") {
			continue
		}
		
		data, err := os.ReadFile(filepath.Join(datastoreDir, e.Name()))
		if err != nil { continue }

		var nodeData map[string]interface{}
		if err := json.Unmarshal(data, &nodeData); err != nil { continue }

		id, _ := nodeData["@id"].(string)
		nodeType, _ := nodeData["@type"].(string)
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

		if desc, ok := nodeData["description"].(string); ok { node.Content = desc }
		if content, ok := nodeData["gh:content"].(map[string]interface{}); ok {
			node.LocalizedContent = make(map[string]string)
			for k, v := range content { node.LocalizedContent[k] = v.(string) }
			if node.Content == "" { node.Content = node.LocalizedContent["ja"] }
		}

		s.NodeCache[id] = node

		// Extract relations
		if participants, ok := nodeData["gh:participants"].([]interface{}); ok {
			relType, _ := nodeData["gh:relationType"].(string)
			strength, _ := nodeData["gh:strength"].(float64)
			for _, p := range participants {
				pID, _ := p.(string)
				if pID != "" && pID != id {
					s.EdgeCache = append(s.EdgeCache, &editorpb.Edge{
						FromId: id, ToId: pID, Relation: relType, Strength: float32(strength), Group: "semantic",
					})
				}
			}
		}
		
		if contains, ok := nodeData["gh:contains"].([]interface{}); ok {
			for _, c := range contains {
				cID, _ := c.(string)
				if cID != "" {
					s.EdgeCache = append(s.EdgeCache, &editorpb.Edge{
						FromId: id, ToId: cID, Relation: "gh:contains", Group: "structural",
					})
				}
			}
		}
	}
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
	
	// Initial project load and migration
	projectID := "251022"
	s.DeepFlattenDatastore(projectID)
	s.LoadDatastore(projectID)

	return s
}

func (s *EditorServer) GetTopology(ctx context.Context, req *connect.Request[editorpb.GetTopologyRequest]) (*connect.Response[editorpb.GetTopologyResponse], error) {
	log.Printf("RPC: GetTopology (MemoryStore) called for: %s", req.Msg.ProjectId)
	if len(s.NodeCache) == 0 { s.LoadDatastore(req.Msg.ProjectId) }
	
	resp := &editorpb.GetTopologyResponse{}
	hubs := make(map[string]bool)
	connected := make(map[string]bool)

	// First pass: identify non-block nodes and high-level connections
	for _, edge := range s.EdgeCache {
		connected[edge.FromId] = true
		connected[edge.ToId] = true
	}

	for _, node := range s.NodeCache {
		if node.Type != "gh:Block" {
			resp.Nodes = append(resp.Nodes, node)
			group := node.Group
			if !connected[node.Id] {
				group = "unlinked"
				node.Group = "unlinked"
			}
			if group != "" && group != "meta" && group != "link-node" {
				hubs[group] = true
			}
		}
	}
	
	// Ensure hubs exist
	for group := range hubs {
		hubID := "hub:" + group
		hLabel := strings.Title(group) + " Circle"
		if group == "unlinked" { hLabel = "Unlinked Context Circle" }
		
		resp.Nodes = append(resp.Nodes, &editorpb.Node{
			Id: hubID, Label: hLabel, Type: "gh:ClusterHub", Group: "meta",
			ViewType: s.determineViewType(hubID, "gh:ClusterHub", "meta"),
		})
		
		for _, node := range resp.Nodes {
			if node.Group == group {
				resp.Edges = append(resp.Edges, &editorpb.Edge{
					FromId: hubID, ToId: node.Id, Relation: "gh:memberOf", Group: "structural",
				})
			}
		}
	}

	for _, edge := range s.EdgeCache {
		resp.Edges = append(resp.Edges, edge)
	}

	return connect.NewResponse(resp), nil
}

func (s *EditorServer) GetBlocks(ctx context.Context, req *connect.Request[editorpb.GetBlocksRequest]) (*connect.Response[editorpb.GetBlocksResponse], error) {
	log.Printf("RPC: GetBlocks (MemoryStore) called for: %s", req.Msg.ManuscriptId)
	resp := &editorpb.GetBlocksResponse{}
	if len(s.NodeCache) == 0 { s.LoadDatastore(req.Msg.ProjectId) }
	var manuscriptBlocks []*editorpb.Node
	for _, edge := range s.EdgeCache {
		if edge.FromId == req.Msg.ManuscriptId && edge.Relation == "gh:contains" {
			if node, ok := s.NodeCache[edge.ToId]; ok { manuscriptBlocks = append(manuscriptBlocks, node) }
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
	case strings.Contains(t, "Item") || strings.Contains(t, "Object") || strings.Contains(t, "Product"): return "item"
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
	return connect.NewResponse(&editorpb.GetProjectMetadataResponse{Title: "Ghost Hacker"}), nil
}

func (s *EditorServer) SaveStoryboard(ctx context.Context, req *connect.Request[editorpb.SaveStoryboardRequest]) (*connect.Response[editorpb.SaveStoryboardResponse], error) {
	return connect.NewResponse(&editorpb.SaveStoryboardResponse{Success: true}), nil
}

func (s *EditorServer) GetStoryboard(ctx context.Context, req *connect.Request[editorpb.GetStoryboardRequest]) (*connect.Response[editorpb.GetStoryboardResponse], error) {
	return connect.NewResponse(&editorpb.GetStoryboardResponse{}), nil
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

func main() {
	workspaceRoot := "/Volumes/251214/jun784/ghosthacker/apps/zen-editor/data"
	srv := NewEditorServer(workspaceRoot)
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("OK")) })
	path, handler := editorpbconnect.NewEditorServiceHandler(srv)
	mux.Handle(path, withCORS(handler))
	http.ListenAndServe(":8080", h2c.NewHandler(mux, &http2.Server{}))
}
