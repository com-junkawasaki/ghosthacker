import Link from "next/link";
import NodePanel from "@/components/NodePanel";

// Merkle DAG Node: video-gen (type: VideoGen)
export default function VideoGenPage() {
  return (
    <div className="h-full w-full p-6">
      <div className="mb-4">
        <Link href="/canvas" className="text-blue-600 hover:underline">← Back to Canvas</Link>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900">Video Generation</h1>
      <p className="text-gray-700 mt-2">Generate video using images, narration, and script.</p>

      <NodePanel
        nodeId="video-gen"
        nodeType="VideoGen"
        label="Video Generation"
        dependsOn={["image-gen", "tts-narration", "writer-content"]}
        outputs={["video", "script"]}
        config={{ preferredRenderer: "sora", resolution: "1080p", duration: 300 }}
      />
    </div>
  );
}


