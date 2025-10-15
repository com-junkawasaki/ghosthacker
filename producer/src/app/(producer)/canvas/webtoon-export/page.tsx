import Link from "next/link";
import NodePanel from "@/components/NodePanel";
import NodeConfigForm from "@/components/NodeConfigForm.client";

// Merkle DAG Node: webtoon-export (type: WebtoonExport)
export default function WebtoonExportPage() {
  return (
    <div className="h-full w-full p-6">
      <div className="mb-4">
        <Link href="/canvas" className="text-blue-600 hover:underline">← Back to Canvas</Link>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900">Webtoon: Export</h1>
      <p className="text-gray-700 mt-2">Export episode assets for Webtoon.</p>

      <NodePanel
        nodeId="webtoon-export"
        nodeType="WebtoonExport"
        label="Webtoon Export"
        dependsOn={["webtoon-layout"]}
        outputs={["episode", "assets", "download_url"]}
        config={{ format: "webp-sequence", platform: "webtoon", quality: "high" }}
      />

      <NodeConfigForm
        nodeId="webtoon-export"
        nodeType="WebtoonExport"
        defaultValues={{ format: "webp-sequence", platform: "webtoon", quality: "high" }}
      />
    </div>
  );
}


