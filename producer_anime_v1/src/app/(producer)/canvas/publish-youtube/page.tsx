import Link from "next/link";
import NodePanel from "@/components/NodePanel";
import NodeConfigForm from "@/components/NodeConfigForm.client";

// Merkle DAG Node: publish-youtube (type: PublishYouTube)
export default function PublishYouTubePage() {
  return (
    <div className="h-full w-full p-6">
      <div className="mb-4">
        <Link href="/canvas" className="text-blue-600 hover:underline">← Back to Canvas</Link>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900">Publish: YouTube</h1>
      <p className="text-gray-700 mt-2">Upload rendered video to YouTube with metadata.</p>

      <NodePanel
        nodeId="publish-youtube"
        nodeType="PublishYouTube"
        label="YouTube Upload"
        dependsOn={["render-video"]}
        outputs={["youtube_id", "upload_url"]}
        config={{ privacy: "unlisted", title: "Ghost Hacker - Episode 1", description: "Atmospheric ghost story adaptation", tags: ["ghost", "horror", "supernatural"] }}
      />

      <NodeConfigForm
        nodeId="publish-youtube"
        nodeType="PublishYouTube"
        defaultValues={{ privacy: "unlisted", title: "Ghost Hacker - Episode 1", description: "Atmospheric ghost story adaptation", tags: ["ghost", "horror", "supernatural"] }}
      />
    </div>
  );
}


