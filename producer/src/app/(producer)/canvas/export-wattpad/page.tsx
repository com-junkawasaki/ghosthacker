import Link from "next/link";

// Merkle DAG Node: export-wattpad (type: ExportWattpad)
export default function ExportWattpadPage() {
  return (
    <div className="h-full w-full p-6">
      <div className="mb-4">
        <Link href="/canvas" className="text-blue-600 hover:underline">← Back to Canvas</Link>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900">Export: Wattpad</h1>
      <p className="text-gray-700 mt-2">Package story and images for Wattpad.</p>
    </div>
  );
}


