'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { nodeSchemas, type NodeTypeKey } from '@/schemas/nodes';
import { saveNodeConfig } from '@/app/(producer)/canvas/actions';

type NodeConfigFormProps<TSchemaKey extends NodeTypeKey> = {
  nodeId: string;
  nodeType: TSchemaKey;
  defaultValues: unknown;
};

// Merkle DAG: Client form to edit node config and persist via server action
export default function NodeConfigForm<TSchemaKey extends NodeTypeKey>({ nodeId, nodeType, defaultValues }: NodeConfigFormProps<TSchemaKey>) {
  const schema = nodeSchemas[nodeType];
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm({
    resolver: valibotResolver(schema as never),
    defaultValues: defaultValues as never,
    mode: 'onBlur',
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const res = await saveNodeConfig({ nodeId, nodeType, config: values });
      if (res.ok) {
        setMessage('Saved successfully');
      } else {
        setMessage('Validation error');
      }
    });
  });

  // Simple dynamic renderer for flat object values
  const fields = Object.keys((defaultValues ?? {}) as Record<string, unknown>);

  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm backdrop-blur dark:bg-gray-900/80 dark:border-gray-700">
      <div className="text-sm font-medium text-gray-900 mb-3">Edit Config</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((key) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs text-gray-500" htmlFor={key}>{key}</label>
            <input
              id={key}
              {...form.register(key as never)}
              className="h-10 rounded border border-gray-300 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {form.formState.errors[key as keyof typeof form.formState.errors] && (
              <span className="text-xs text-red-600">Invalid {key}</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={isPending} className="h-10 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          {isPending ? 'Saving…' : 'Save'}
        </button>
        {message && <span className="text-sm text-gray-700">{message}</span>}
      </div>
    </form>
  );
}


