import { loadTopology } from "./src/pipeline/loadTopology";
import { runPipeline } from "./src/pipeline/executor";
import type { Node, Edge } from "@reactflow/core";

// Convert story topology to ReactFlow format
function convertTopologyToReactFlow(topology: any): { nodes: Node[], edges: Edge[] } {
  const nodes: Node[] = topology.pipeline.map((node: any, index: number) => ({
    id: node.id,
    type: node.type,
    position: { x: index * 200, y: 0 }, // Simple positioning for testing
    data: {
      label: node.label,
      config: node.config,
      outputs: node.outputs,
      ...node
    }
  }));

  const edges: Edge[] = [];

  // Create edges based on dependsOn
  topology.pipeline.forEach((node: any) => {
    if (node.dependsOn) {
      node.dependsOn.forEach((depId: string) => {
        edges.push({
          id: `${depId}-${node.id}`,
          source: depId,
          target: node.id,
          type: 'default'
        });
      });
    }
  });

  return { nodes, edges };
}

async function testPipeline() {
  try {
    console.log("Loading topology...");
    const topology = loadTopology();

    const pipelineNodes = topology["@graph"].filter((node): node is any => node["@type"] === "gh:PipelineNode");
    console.log(`Loaded ${pipelineNodes.length} pipeline nodes from JSON-LD topology`);

    console.log("Starting pipeline execution...");
    await runPipeline(topology);

    console.log("Pipeline execution completed successfully!");
  } catch (error) {
    console.error("Pipeline execution failed:", error);
    process.exit(1);
  }
}

testPipeline();
