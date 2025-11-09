'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { createActor, createMachine } from 'xstate';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { nodeSchemas } from '@/schemas/nodes';
import { saveNodeConfig } from '@/app/(producer)/canvas/actions';

// XState machine for Writer form
interface WriterContext {
  model: string;
  maxTokens: number;
  temperature: number;
  status: 'idle' | 'saving' | 'success' | 'error';
  error: string | null;
}

type WriterEvent =
  | { type: 'UPDATE_FIELD'; field: keyof WriterContext; value: string | number }
  | { type: 'SAVE' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; error: string }
  | { type: 'RESET' };

const writerMachine = createMachine({
  id: 'writer',
  initial: 'idle',
  context: {
    model: 'gpt-4o-mini',
    maxTokens: 2000,
    temperature: 0.7,
    status: 'idle',
    error: null,
  },
  states: {
    idle: {
      on: {
        UPDATE_FIELD: {
          actions: 'updateField',
        },
        SAVE: 'saving',
      },
    },
    saving: {
      on: {
        SAVE_SUCCESS: 'success',
        SAVE_ERROR: {
          target: 'error',
          actions: 'setError',
        },
      },
    },
    success: {
      after: {
        2000: 'idle',
      },
      on: {
        RESET: 'idle',
      },
    },
    error: {
      on: {
        SAVE: 'saving',
        RESET: 'idle',
      },
    },
  },
}, {
  actions: {
    updateField: (context: any, event: any) => {
      if (event?.type === 'UPDATE_FIELD') {
        context[event.field] = event.value;
      }
    },
    setError: (context: any, event: any) => {
      if (event?.type === 'SAVE_ERROR') {
        context.error = event.error;
        context.status = 'error';
      }
    },
  },
});

function WriterFormComponent() {

  // XState actor for form state management
  const [actor] = useState(() => createActor(writerMachine).start());
  const [actorState, setActorState] = useState(actor.getSnapshot());

  // Subscribe to actor state changes
  useEffect(() => {
    const subscription = actor.subscribe(setActorState);
    return () => subscription.unsubscribe();
  }, [actor]);

  const schema = nodeSchemas.Writer;
  const form = useForm({
    resolver: valibotResolver(schema as never),
    defaultValues: {
      model: actorState.context.model,
      maxTokens: actorState.context.maxTokens,
      temperature: actorState.context.temperature,
    },
    mode: 'onChange',
  });

  // Update form when actor state changes
  useEffect(() => {
    form.reset({
      model: actorState.context.model,
      maxTokens: actorState.context.maxTokens,
      temperature: actorState.context.temperature,
    });
  }, [actorState.context.model, actorState.context.maxTokens, actorState.context.temperature, form]);

  const handleFieldChange = useCallback((field: keyof WriterContext, value: string | number) => {
    actor.send({ type: 'UPDATE_FIELD', field, value });
  }, [actor]);

  const onSubmit = useCallback(async (values: { model: string; maxTokens: number; temperature: number }) => {
    actor.send({ type: 'SAVE' });

    try {
      const result = await saveNodeConfig({
        nodeId: 'writer-content',
        nodeType: 'Writer',
        config: values,
      });

      if (result.ok) {
        actor.send({ type: 'SAVE_SUCCESS' });

        // Notify Canvas to update nodes
        window.dispatchEvent(new CustomEvent('node-config-saved', {
          detail: { nodeId: 'writer-content', nodeType: 'Writer', config: values }
        }));
      } else {
        actor.send({
          type: 'SAVE_ERROR',
          error: 'Validation error',
        });
      }
    } catch (error) {
      actor.send({
        type: 'SAVE_ERROR',
        error: error instanceof Error ? error.message : 'Failed to save writer config',
      });
    }
  }, [actor]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm backdrop-blur dark:bg-gray-900/80 dark:border-gray-700">
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Edit Writer</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="model">Model</label>
          <select
            id="model"
            {...form.register('model')}
            onChange={(e) => {
              form.setValue('model', e.target.value);
              handleFieldChange('model', e.target.value);
            }}
            className="h-10 rounded border border-gray-300 px-3 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="gpt-4o-mini">gpt-4o-mini</option>
          </select>
          {form.formState.errors.model && (
            <span className="text-xs text-red-600">Invalid model</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="maxTokens">Max Tokens</label>
          <input
            id="maxTokens"
            type="number"
            {...form.register('maxTokens', { valueAsNumber: true })}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              form.setValue('maxTokens', value);
              handleFieldChange('maxTokens', value);
            }}
            className="h-10 rounded border border-gray-300 px-3 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {form.formState.errors.maxTokens && (
            <span className="text-xs text-red-600">Invalid max tokens</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="temperature">Temperature</label>
          <input
            id="temperature"
            type="number"
            step="0.1"
            min="0"
            max="2"
            {...form.register('temperature', { valueAsNumber: true })}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              form.setValue('temperature', value);
              handleFieldChange('temperature', value);
            }}
            className="h-10 rounded border border-gray-300 px-3 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {form.formState.errors.temperature && (
            <span className="text-xs text-red-600">Invalid temperature</span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={actorState.matches('saving')}
          className="h-10 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {actorState.matches('saving') ? 'Saving…' : 'Save'}
        </button>

        {actorState.matches('success') && (
          <span className="text-sm text-green-700">Saved successfully</span>
        )}

        {actorState.matches('error') && (
          <span className="text-sm text-red-600">{actorState.context.error}</span>
        )}
      </div>
    </form>
  );
}

export default function WriterForm() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <WriterFormComponent />
    </QueryClientProvider>
  );
}
