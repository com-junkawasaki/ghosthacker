export type GenericNode = {
  id: string;
  type: string;
  label?: string;
  config?: Record<string, unknown>;
};

export type StoryTopology = {
  pipeline: GenericNode[];
  executionOrder: (string | string[])[];
};


