import Link from "next/link";
import NodePanel from "@/components/NodePanel";
import NodeConfigForm from "@/components/NodeConfigForm.client";
import { loadNodeConfig } from "../actions";

// Merkle DAG Node: source-ep1 (type: SourceDoc)
export default async function SourceEp1Page() {
  const { config } = await loadNodeConfig({ nodeId: "source-ep1", nodeType: "SourceDoc", fallback: { episodeId: "ja_Episode_01_Masterpiece", sourcePath: "../250806/episodes/ja_Episode_01_Masterpiece.md" } });
  return (
    <div className="h-full w-full p-6">
      <div className="mb-4">
        <Link href="/canvas" className="text-blue-600 hover:underline dark:text-blue-400">← Back to Canvas</Link>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Source: Episode 1</h1>
      <p className="text-gray-700 dark:text-gray-300 mt-2">Source document configuration and inputs.</p>

      <NodePanel
        nodeId="source-ep1"
        nodeType="SourceDoc"
        label="Episode 1 Source"
        outputs={["draft"]}
        config={config}
      />

      <NodeConfigForm
        nodeId="source-ep1"
        nodeType="SourceDoc"
        defaultValues={config}
      />
    </div>
  );
}


