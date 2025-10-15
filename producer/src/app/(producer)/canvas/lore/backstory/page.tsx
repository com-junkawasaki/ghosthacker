import Link from "next/link";
import NodePanel from "@/components/NodePanel";

// Merkle DAG Node: lore-backstory (type: Backstory)
export default function LoreBackstoryPage() {
  return (
    <div className="h-full w-full p-6">
      <div className="mb-4">
        <Link href="/canvas" className="text-blue-600 hover:underline">← Back to Canvas</Link>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900">Lore: Backstory</h1>
      <p className="text-gray-700 mt-2">Define origin, motivation, and conflict.</p>

      <NodePanel
        nodeId="lore-backstory"
        nodeType="Backstory"
        label="Backstory"
        outputs={["origin", "motivation", "conflict"]}
        config={{ origin: "Tokyo underground", motivation: "Find lost sister", conflict: "Corporate AI" }}
      />
    </div>
  );
}


