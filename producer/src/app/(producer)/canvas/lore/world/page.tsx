import Link from "next/link";
import NodePanel from "@/components/NodePanel";

// Merkle DAG Node: lore-world (type: World)
export default function LoreWorldPage() {
  return (
    <div className="h-full w-full p-6">
      <div className="mb-4">
        <Link href="/canvas" className="text-blue-600 hover:underline">← Back to Canvas</Link>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900">Lore: World</h1>
      <p className="text-gray-700 mt-2">Define setting, era, and world rules.</p>

      <NodePanel
        nodeId="lore-world"
        nodeType="World"
        label="World"
        outputs={["setting", "era", "rules"]}
        config={{ setting: "Near-future Tokyo", era: "2042", rules: "Ghost-net protocols" }}
      />
    </div>
  );
}


