import Link from "next/link";
import NodePanel from "@/components/NodePanel";
import NodeConfigForm from "@/components/NodeConfigForm.client";

// Merkle DAG Node: tts-narration (type: TTS)
export default function TTSNarrationPage() {
  return (
    <div className="h-full w-full p-6">
      <div className="mb-4">
        <Link href="/canvas" className="text-blue-600 hover:underline">← Back to Canvas</Link>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900">Narration: TTS</h1>
      <p className="text-gray-700 mt-2">Synthesize narration audio from writer output.</p>

      <NodePanel
        nodeId="tts-narration"
        nodeType="TTS"
        label="Narration TTS"
        dependsOn={["writer-content"]}
        outputs={["audio", "timestamps"]}
        config={{ voice: "alloy", speed: 1.0, format: "mp3" }}
      />

      <NodeConfigForm
        nodeId="tts-narration"
        nodeType="TTS"
        defaultValues={{ voice: "alloy", speed: 1.0, format: "mp3" }}
      />
    </div>
  );
}


