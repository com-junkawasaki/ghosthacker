import Link from "next/link";
import NodePanel from "@/components/NodePanel";
import NodeConfigForm from "@/components/NodeConfigForm.client";

// Merkle DAG Node: writer-content (type: Writer)
export default function WriterContentPage() {
  return (
    <div className="h-full w-full p-6">
      <div className="mb-4">
        <Link href="/canvas" className="text-blue-600 hover:underline">← Back to Canvas</Link>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900">Writer: Content</h1>
      <p className="text-gray-700 mt-2">Run AI writer to produce script and metadata.</p>

      <NodePanel
        nodeId="writer-content"
        nodeType="Writer"
        label="Content Writer"
        dependsOn={["prompt-story"]}
        outputs={["script", "metadata"]}
        config={{ model: "gpt-4o-mini", maxTokens: 2000, temperature: 0.7 }}
      />

      <NodeConfigForm
        nodeId="writer-content"
        nodeType="Writer"
        defaultValues={{ model: "gpt-4o-mini", maxTokens: 2000, temperature: 0.7 }}
      />
    </div>
  );
}


