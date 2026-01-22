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
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"

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
	Neo4jDriver   neo4j.DriverWithContext

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

func (s *EditorServer) syncToNeo4j(ctx context.Context) error {
	if s.Neo4jDriver == nil {
		return fmt.Errorf("neo4j driver not initialized")
	}

	session := s.Neo4jDriver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		// 1. Create/Update Nodes
		for _, node := range s.NodeCache {
			props := map[string]interface{}{
				"id":      node.Id,
				"label":   node.Label,
				"type":    node.Type,
				"group":   node.Group,
				"content": node.Content,
			}
			if node.ImagePath != "" { props["image_path"] = node.ImagePath }
			
			query := `MERGE (n:Node {id: $id}) SET n += $props`
			if node.Group != "" {
				query = fmt.Sprintf("MERGE (n:%s {id: $id}) SET n += $props", strings.Title(node.Group))
			}
			
			_, err := tx.Run(ctx, query, map[string]interface{}{
				"id":    node.Id,
				"props": props,
			})
			if err != nil { return nil, err }
		}

		// 2. Create/Update Edges
		for _, edge := range s.EdgeCache {
			relName := strings.ReplaceAll(strings.TrimPrefix(edge.Relation, "gh:"), ":", "_")
			if relName == "" { relName = "RELATED_TO" }
			query := fmt.Sprintf(`
				MATCH (a {id: $from}), (b {id: $to})
				MERGE (a)-[r:%s]->(b)
				SET r.relation = $rel, r.group = $group
			`, strings.ToUpper(relName))
			
			_, err := tx.Run(ctx, query, map[string]interface{}{
				"from":  edge.FromId,
				"to":    edge.ToId,
				"rel":   edge.Relation,
				"group": edge.Group,
			})
			if err != nil { return nil, err }
		}
		return nil, nil
	})

	return err
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
			if label == "" { label = id } // Fallback to ID if no name/label
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
			if img, ok := nodeData["gh:imagePath"].(string); ok {
				node.ImagePath = img
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

			// Special handling for Storyboard to create hierarchy
			if nodeType == "gh:Storyboard" {
				if scenes, ok := nodeData["gh:scenes"].([]interface{}); ok {
					for _, sVal := range scenes {
						sceneData, ok := sVal.(map[string]interface{})
						if !ok { continue }
						
						sID, _ := sceneData["id"].(float64)
						sDesc, _ := sceneData["description"].(string)
						
						// Parse "Episode X, Page Y, Panel Z" from description
						episodeNum := "1"
						pageNum := "1"
						panelNum := fmt.Sprintf("%d", int(sID))
						
						parts := strings.Split(sDesc, ",")
						for _, p := range parts {
							p = strings.TrimSpace(p)
							if strings.HasPrefix(p, "Episode") {
								episodeNum = strings.TrimSpace(strings.TrimPrefix(p, "Episode"))
							} else if strings.HasPrefix(p, "Page") {
								pageNum = strings.TrimSpace(strings.TrimPrefix(p, "Page"))
							} else if strings.HasPrefix(p, "Panel") {
								panelNum = strings.TrimSpace(strings.TrimPrefix(p, "Panel"))
							}
						}

						epID := fmt.Sprintf("hub:episode:%s", episodeNum)
						pgID := fmt.Sprintf("hub:episode:%s:page:%s", episodeNum, pageNum)
						cutID := fmt.Sprintf("cut:%d", int(sID))

						// Ensure Episode Hub
						if _, ok := s.NodeCache[epID]; !ok {
							s.NodeCache[epID] = &editorpb.Node{
								Id: epID, Label: "Episode " + episodeNum, Type: "gh:EpisodeHub", Group: "content", ViewType: "storyboard",
							}
							s.EdgeCache = append(s.EdgeCache, &editorpb.Edge{FromId: id, ToId: epID, Relation: "gh:contains", Group: "structural"})
						}
						// Ensure Page Hub
						if _, ok := s.NodeCache[pgID]; !ok {
							s.NodeCache[pgID] = &editorpb.Node{
								Id: pgID, Label: "Page " + pageNum, Type: "gh:PageHub", Group: "content", ViewType: "storyboard",
							}
							s.EdgeCache = append(s.EdgeCache, &editorpb.Edge{FromId: epID, ToId: pgID, Relation: "gh:contains", Group: "structural"})
						}
						// Scene Node
						s.NodeCache[cutID] = &editorpb.Node{
							Id: cutID, Label: "Cut " + panelNum, Type: "gh:Cut", Group: "content", Content: sDesc, ViewType: "storyboard",
						}
						s.EdgeCache = append(s.EdgeCache, &editorpb.Edge{FromId: pgID, ToId: cutID, Relation: "gh:contains", Group: "structural"})
					}
				}
			}

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

	// Load README.md as a node
	readmePath := filepath.Join(s.WorkspaceRoot, projectID, "README.md")
	if data, err := os.ReadFile(readmePath); err == nil {
		id := "doc:readme"
		s.NodeCache[id] = &editorpb.Node{
			Id: id, Label: "README.md", Type: "gh:Document", Group: "meta", Content: string(data), ViewType: "editor",
		}
	}

	log.Printf("Loaded %d nodes and %d edges from datastore for %s", len(s.NodeCache), len(s.EdgeCache), projectID)

	// Sync to Neo4j in background
	go func() {
		if err := s.syncToNeo4j(context.Background()); err != nil {
			log.Printf("Warning: failed to sync to Neo4j: %v", err)
		} else {
			log.Printf("Successfully synced %d nodes to Neo4j", len(s.NodeCache))
		}
	}()
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

	// 1. Migrate root JSON-LD files
	rootFiles, _ := os.ReadDir(filepath.Join(s.WorkspaceRoot, projectID))
	for _, f := range rootFiles {
		if !f.IsDir() && strings.HasSuffix(f.Name(), ".jsonld") {
			path := filepath.Join(s.WorkspaceRoot, projectID, f.Name())
			if data, err := os.ReadFile(path); err == nil {
				// If it's character_profiles, expand it
				if f.Name() == "character_profiles.jsonld" {
					var cp struct { Characters []map[string]interface{} `json:"gh:characters"` }
					json.Unmarshal(data, &cp)
					for _, char := range cp.Characters {
						if id, ok := char["@id"].(string); ok {
							// Link to image if exists
							nameParts := strings.Split(id, ":")
							if len(nameParts) > 1 {
								charDir := filepath.Join(s.WorkspaceRoot, projectID, "characters", nameParts[1])
								if imgs, err := os.ReadDir(charDir); err == nil && len(imgs) > 0 {
									char["gh:imagePath"] = fmt.Sprintf("/data/%s/characters/%s/%s", projectID, nameParts[1], imgs[0].Name())
								}
							}
							saveNode(id, char)
						}
					}
				} else if f.Name() == "manga_script.jsonld" {
					var ms struct { Pages []map[string]interface{} `json:"gh:pages"` }
					json.Unmarshal(data, &ms)
					for _, pg := range ms.Pages {
						if id, ok := pg["@id"].(string); ok {
							pg["@type"] = "gh:MangaPage"
							saveNode(id, pg)
							if panels, ok := pg["gh:panels"].([]interface{}); ok {
								for _, pVal := range panels {
									if pData, ok := pVal.(map[string]interface{}); ok {
										pID := fmt.Sprintf("%s:panel:%v", id, pData["panel:id"])
										pData["@id"] = pID
										pData["@type"] = "gh:MangaPanel"
										saveNode(pID, pData)
									}
								}
							}
						}
					}
				} else {
					var nodeData map[string]interface{}
					if err := json.Unmarshal(data, &nodeData); err == nil {
						if id, ok := nodeData["@id"].(string); ok {
							saveNode(id, nodeData)
						}
					}
				}
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

	// Neo4j Setup
	neo4jUri := os.Getenv("NEO4J_URI")
	if neo4jUri == "" {
		neo4jUri = "bolt://localhost:7687"
	}
	neo4jUser := os.Getenv("NEO4J_USER")
	if neo4jUser == "" {
		neo4jUser = "neo4j"
	}
	neo4jPassword := os.Getenv("NEO4J_PASSWORD")
	if neo4jPassword == "" {
		neo4jPassword = "password"
	}

	driver, err := neo4j.NewDriverWithContext(neo4jUri, neo4j.BasicAuth(neo4jUser, neo4jPassword, ""))
	if err != nil {
		log.Printf("Warning: failed to connect to Neo4j: %v", err)
	}

	s := &EditorServer{
		WorkspaceRoot: dataRoot,
		MCPServer:     server.NewMCPServer("GhostHackerEditor", "1.0.0"),
		NodeEmotions:  initNodeEmotions(),
		ToolHandlers:  make(map[string]func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error)),
		DB:            db,
		Git:           git.NewGitService(dataRoot),
		Neo4jDriver:   driver,
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
	log.Printf("RPC: GetTopology called for project: %s", req.Msg.ProjectId)
	
	s.mu.RLock()
	needsLoad := s.currentProjectID != req.Msg.ProjectId || len(s.NodeCache) == 0
	s.mu.RUnlock()

	if needsLoad {
		s.LoadDatastore(req.Msg.ProjectId)
	}

	// Try reading from Neo4j if available
	if s.Neo4jDriver != nil {
		session := s.Neo4jDriver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
		defer session.Close(ctx)
		
		res, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
			// Get Nodes
			nodeRes, err := tx.Run(ctx, `MATCH (n:Node) RETURN n`, nil)
			if err != nil { return nil, err }
			
			var nodes []*editorpb.Node
			for nodeRes.Next(ctx) {
				record := nodeRes.Record()
				n, _ := record.Get("n")
				node := n.(neo4j.Node)
				
				pbNode := &editorpb.Node{
					Id:    node.Props["id"].(string),
					Label: node.Props["label"].(string),
					Type:  node.Props["type"].(string),
					Group: node.Props["group"].(string),
				}
				if c, ok := node.Props["content"].(string); ok { pbNode.Content = c }
				if img, ok := node.Props["image_path"].(string); ok { pbNode.ImagePath = img }
				pbNode.ViewType = s.determineViewType(pbNode.Id, pbNode.Type, pbNode.Group)
				nodes = append(nodes, pbNode)
			}

			// Get Edges
			edgeRes, err := tx.Run(ctx, `MATCH (a)-[r]->(b) RETURN a.id as from, b.id as to, type(r) as rel, r.group as group`, nil)
			if err != nil { return nil, err }
			
			var edges []*editorpb.Edge
			for edgeRes.Next(ctx) {
				rec := edgeRes.Record()
				from, _ := rec.Get("from")
				to, _ := rec.Get("to")
				rel, _ := rec.Get("rel")
				group, _ := rec.Get("group")
				
				edges = append(edges, &editorpb.Edge{
					FromId: from.(string),
					ToId:   to.(string),
					Relation: "gh:" + strings.ToLower(rel.(string)),
					Group: group.(string),
				})
			}
			return &editorpb.GetTopologyResponse{Nodes: nodes, Edges: edges}, nil
		})

		if err == nil && res != nil {
			resp := res.(*editorpb.GetTopologyResponse)
			if len(resp.Nodes) > 0 {
				log.Printf("GetTopology: Returning %d nodes from Neo4j", len(resp.Nodes))
				// Post-process hubs and hierarchy (same logic as before)
				return s.postProcessTopology(resp), nil
			}
		}
		log.Printf("GetTopology: Neo4j returned no data or failed (%v), falling back to cache", err)
	}
	
	s.mu.RLock()
	defer s.mu.RUnlock()

	resp := &editorpb.GetTopologyResponse{}
	for _, n := range s.NodeCache {
		nCopy := *n
		nCopy.Children = nil
		resp.Nodes = append(resp.Nodes, &nCopy)
	}
	
	// Copy edges
	for _, e := range s.EdgeCache {
		eCopy := *e
		resp.Edges = append(resp.Edges, &eCopy)
	}

	return s.postProcessTopology(resp), nil
}

func (s *EditorServer) postProcessTopology(resp *editorpb.GetTopologyResponse) *connect.Response[editorpb.GetTopologyResponse] {
	hubs := make(map[string]*editorpb.Node)
	connected := make(map[string]bool)
	hasParent := make(map[string]bool)

	// Pre-identify connected nodes and children
	for _, edge := range resp.Edges {
		connected[edge.FromId] = true
		connected[edge.ToId] = true
		if edge.Relation == "gh:contains" || edge.Relation == "gh:partOf" || edge.Relation == "gh:memberOf" {
			hasParent[edge.ToId] = true
		}
	}

	finalNodes := []*editorpb.Node{}
	for _, node := range resp.Nodes {
		// Filter out blocks and other noise for the high-level topology
		if node.Type == "gh:Block" || strings.HasPrefix(node.Id, "block:") {
			continue
		}
		
		// Map specific types to specialized circles
		if node.Type == "gh:EpisodeHub" {
			node.Type = "gh:ClusterHub"
			node.Group = "episode"
		} else if node.Type == "gh:PageHub" {
			node.Type = "gh:ClusterHub"
			node.Group = "page"
		} else if node.Type == "gh:Cut" || node.Type == "gh:MangaPanel" {
			node.Group = "panel"
		}
		
		group := node.Group
		if !connected[node.Id] && group != "episode" && group != "page" && group != "panel" {
			group = "unlinked"
			node.Group = "unlinked"
		}
		
		finalNodes = append(finalNodes, node)
		
		// Only create group hubs for nodes that don't have an explicit parent
		// and are not already hubs themselves or panels
		if !hasParent[node.Id] && group != "" && group != "meta" && group != "link-node" && group != "episode" && group != "page" && group != "panel" {
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

	for _, hub := range hubs {
		finalNodes = append(finalNodes, hub)
	}

	resp.Nodes = finalNodes
	nodeMap := make(map[string]*editorpb.Node)
	for _, n := range resp.Nodes { nodeMap[n.Id] = n }

	// Build hierarchy for group hubs
	for _, node := range resp.Nodes {
		if !hasParent[node.Id] && node.Group != "" && node.Group != "meta" && node.Group != "link-node" && node.Group != "episode" {
			hubID := "hub:" + node.Group
			if hub, ok := nodeMap[hubID]; ok {
				hub.Children = append(hub.Children, node.Id)
			}
		}
	}

	// Build hierarchy from explicit edges
	for _, edge := range resp.Edges {
		if from, ok := nodeMap[edge.FromId]; ok {
			if _, ok := nodeMap[edge.ToId]; ok {
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

	return connect.NewResponse(resp)
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
	case strings.Contains(t, "Manuscript") || strings.Contains(t, "Block") || strings.Contains(t, "Episode") || strings.Contains(t, "Storyboard") || strings.Contains(t, "Page") || strings.Contains(t, "Cut"): return "content"
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
	log.Printf("RPC: CallTool called for: %s", req.Msg.Name)
	
	s.mu.RLock()
	handler, ok := s.ToolHandlers[req.Msg.Name]
	s.mu.RUnlock()

	if !ok {
		return connect.NewResponse(&editorpb.CallToolResponse{
			IsError: true, 
			ResultJson: fmt.Sprintf(`{"error": "tool %s not found"}`, req.Msg.Name),
		}), nil
	}

	// The arguments might already be a JSON string or an object depending on the client
	var args mcp.CallToolRequest
	args.Params.Arguments = make(map[string]interface{})
	
	argStr := req.Msg.ArgumentsJson
	if argStr != "" {
		if err := json.Unmarshal([]byte(argStr), &args.Params.Arguments); err != nil {
			log.Printf("Warning: failed to unmarshal arguments: %v, string: %s", err, argStr)
			// Fallback: try to wrap if it's not an object
			args.Params.Arguments["raw"] = argStr
		}
	}

	result, err := handler(ctx, args)
	if err != nil {
		log.Printf("Error in tool handler: %v", err)
		return connect.NewResponse(&editorpb.CallToolResponse{IsError: true, ResultJson: err.Error()}), nil
	}

	resultJson, _ := json.Marshal(result)
	return connect.NewResponse(&editorpb.CallToolResponse{IsError: false, ResultJson: string(resultJson)}), nil
}

func (s *EditorServer) registerMCPTools() {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.ToolHandlers["analyze_links"] = func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		nodeIDs, _ := req.Params.Arguments["node_ids"].([]interface{})
		if len(nodeIDs) == 0 {
			return nil, fmt.Errorf("node_ids is required")
		}
		
		targetID := nodeIDs[0].(string)
		
		// Use Neo4j to find potential links
		if s.Neo4jDriver == nil {
			return nil, fmt.Errorf("neo4j not connected")
		}
		
		session := s.Neo4jDriver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
		defer session.Close(ctx)
		
		// Simple logic: find nodes with similar groups or types
		result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
			query := `
				MATCH (target {id: $id})
				MATCH (other:Node)
				WHERE target.id <> other.id AND (target.group = other.group OR target.type = other.type)
				RETURN other.id as id, other.label as label, other.type as type, other.group as group
				LIMIT 5
			`
			res, err := tx.Run(ctx, query, map[string]interface{}{"id": targetID})
			if err != nil { return nil, err }
			
			var suggestions []map[string]interface{}
			for res.Next(ctx) {
				record := res.Record()
				id, _ := record.Get("id")
				label, _ := record.Get("label")
				
				suggestions = append(suggestions, map[string]interface{}{
					"from": targetID,
					"to": id,
					"relation": "gh:relatesTo",
					"description": fmt.Sprintf("Suggested connection to %s based on similar category.", label),
				})
			}
			return suggestions, nil
		})
		
		if err != nil { return nil, err }
		
		suggestions := result.([]map[string]interface{})
		suggestionsJson, _ := json.Marshal(suggestions)
		
		return &mcp.CallToolResult{
			Content: []mcp.TextContent{
				{Type: "text", Text: string(suggestionsJson)},
			},
		}, nil
	}
}

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

	// Update individual node in Neo4j
	if s.Neo4jDriver != nil {
		go func() {
			ctx := context.Background()
			session := s.Neo4jDriver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
			defer session.Close(ctx)
			session.Run(ctx, `MATCH (n {id: $id}) SET n.content = $content`, map[string]interface{}{
				"id": node.Id, "content": node.Content,
			})
		}()
	}

	return connect.NewResponse(&editorpb.SaveNodeResponse{Success: true, Message: "Node saved to Datastore"}), nil
}

func main() {
	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = "data" // Default to relative data directory
	}
	
	absRoot, _ := filepath.Abs(workspaceRoot)
	log.Printf("Workspace Root: %s (abs: %s)", workspaceRoot, absRoot)
	
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
	log.Printf("Registering Connect handler at: %s", path)
	mux.Handle(path, handler)
	
	// Apply CORS to everything
	handlerWithCORS := withCORS(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("DEBUG: Request received: %s %s", r.Method, r.URL.Path)
		mux.ServeHTTP(w, r)
	}))
	
	log.Printf("Starting server on 0.0.0.0:%s (workspace: %s)", port, workspaceRoot)
	err := http.ListenAndServe("0.0.0.0:"+port, h2c.NewHandler(handlerWithCORS, &http2.Server{}))
	if err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
