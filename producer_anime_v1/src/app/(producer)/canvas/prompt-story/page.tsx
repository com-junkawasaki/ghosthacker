import Link from "next/link";
import NodePanel from "@/components/NodePanel";
import PromptForm from "./PromptForm.client";

// Merkle DAG Node: prompt-story (type: Prompt)
export default function PromptStoryPage() {
  return (
    <div className="h-full w-full p-6">
      <div className="mb-4">
        <Link href="/canvas" className="text-blue-600 hover:underline">← Back to Canvas</Link>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900">Prompt: Story</h1>
      <p className="text-gray-700 mt-2">Compose story prompt from source and lore.</p>

      <NodePanel
        nodeId="prompt-story"
        nodeType="Prompt"
        label="Story Prompt"
        dependsOn={["source-ep1", "lore-protagonist", "lore-backstory", "lore-world"]}
        outputs={["prompt"]}
        config={{ promptType: "story", style: "atmospheric", genre: "ghost-horror" }}
      />

      <PromptForm />
    </div>
  );
}


