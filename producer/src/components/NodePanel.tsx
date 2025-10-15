type NodePanelProps = {
  nodeId: string;
  nodeType: string;
  label: string;
  dependsOn?: string[];
  config?: Record<string, unknown>;
  outputs?: string[];
};

// Merkle DAG: NodePanel renders node metadata for topology validation
export default function NodePanel({ nodeId, nodeType, label, dependsOn, config, outputs }: NodePanelProps) {
  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm backdrop-blur dark:bg-gray-900/80 dark:border-gray-700">
      <div className="text-sm font-medium text-gray-900 mb-3">Node Metadata</div>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-500">ID</dt>
          <dd className="text-gray-900 font-medium">{nodeId}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Type</dt>
          <dd className="text-gray-900 font-medium">{nodeType}</dd>
        </div>
        <div className="md:col-span-2">
          <dt className="text-gray-500">Label</dt>
          <dd className="text-gray-900 font-medium">{label}</dd>
        </div>
        {dependsOn && dependsOn.length > 0 && (
          <div className="md:col-span-2">
            <dt className="text-gray-500">Depends On</dt>
            <dd className="text-gray-900 font-medium">{dependsOn.join(', ')}</dd>
          </div>
        )}
        {outputs && outputs.length > 0 && (
          <div className="md:col-span-2">
            <dt className="text-gray-500">Outputs</dt>
            <dd className="text-gray-900 font-medium">{outputs.join(', ')}</dd>
          </div>
        )}
        {config && (
          <div className="md:col-span-2">
            <dt className="text-gray-500 mb-1">Config</dt>
            <dd>
              <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-auto">{JSON.stringify(config, null, 2)}</pre>
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}


