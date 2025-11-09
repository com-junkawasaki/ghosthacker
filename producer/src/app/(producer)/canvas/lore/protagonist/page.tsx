import Link from "next/link";
import NodePanel from "@/components/NodePanel";
import ProtagonistForm from "./ProtagonistForm.client";

// Merkle DAG Node: lore-protagonist (type: Protagonist)
export default function LoreProtagonistPage() {
  return (
    <div className="h-full w-full p-6">
      <div className="mb-4">
        <Link href="/canvas" className="text-blue-600 hover:underline">← Back to Canvas</Link>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900">Lore: Protagonist</h1>
      <p className="text-gray-700 mt-2">Define protagonist name, role, and traits.</p>

      <NodePanel
        nodeId="lore-protagonist"
        nodeType="Protagonist"
        label="Protagonist"
        outputs={["name", "role", "traits"]}
        config={{ name: "Akito", role: "Hacker", traits: "Stoic, Empathic" }}
      />

      <ProtagonistForm />
    </div>
  );
}


