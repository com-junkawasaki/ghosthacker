import type { Pipeline, PipelineNode, ResourceRequirement, OutputSpecification } from "../ontology/schema";

// JSON-LD based types
export type StoryTopology = {
  "@graph": (Pipeline | PipelineNode | ResourceRequirement | OutputSpecification)[];
};


