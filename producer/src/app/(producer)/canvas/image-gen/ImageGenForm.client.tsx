'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { createActor, createMachine } from 'xstate';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { nodeSchemas } from '@/schemas/nodes';
import { saveNodeConfig } from '@/app/(producer)/canvas/actions';

// XState machine for ImageGen form
interface ImageGenContext {
  model: string;
  style: string;
  count: number;
  status: 'idle' | 'saving' | 'success' | 'error';
  error: string | null;
}

type ImageGenEvent =
  | { type: 'UPDATE_FIELD'; field: keyof ImageGenContext; value: string | number }
  | { type: 'SAVE' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; error: string }
  | { type: 'RESET' };

const imageGenMachine = createMachine({
  id: 'imageGen',
  initial: 'idle',
  context: {
    model: 'flux-1.1-pro',
    style: 'atmospheric-horror',
    count: 5,
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

function ImageGenFormComponent() {

  // XState actor for form state management
  const [actor] = useState(() => createActor(imageGenMachine).start());
  const [actorState, setActorState] = useState(actor.getSnapshot());

  // Subscribe to actor state changes
  useEffect(() => {
    const subscription = actor.subscribe(setActorState);
    return () => subscription.unsubscribe();
  }, [actor]);

  const schema = nodeSchemas.ImageGen;
  const form = useForm({
    resolver: valibotResolver(schema as never),
    defaultValues: {
      model: actorState.context.model,
      style: actorState.context.style,
      count: actorState.context.count,
    },
    mode: 'onChange',
  });

  // Update form when actor state changes
  useEffect(() => {
    form.reset({
      model: actorState.context.model,
      style: actorState.context.style,
      count: actorState.context.count,
    });
  }, [actorState.context.model, actorState.context.style, actorState.context.count, form]);

  const handleFieldChange = useCallback((field: keyof ImageGenContext, value: string | number) => {
    actor.send({ type: 'UPDATE_FIELD', field, value });
  }, [actor]);

  const onSubmit = useCallback(async (values: { model: string; style: string; count: number }) => {
    actor.send({ type: 'SAVE' });

    try {
      const result = await saveNodeConfig({
        nodeId: 'image-gen',
        nodeType: 'ImageGen',
        config: values,
      });

      if (result.ok) {
        actor.send({ type: 'SAVE_SUCCESS' });

        // Notify Canvas to update nodes
        window.dispatchEvent(new CustomEvent('node-config-saved', {
          detail: { nodeId: 'image-gen', nodeType: 'ImageGen', config: values }
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
        error: error instanceof Error ? error.message : 'Failed to save image gen config',
      });
    }
  }, [actor]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm backdrop-blur dark:bg-gray-900/80 dark:border-gray-700">
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Edit Image Generation</div>
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
            <option value="flux-1.1-pro">flux-1.1-pro</option>
          </select>
          {form.formState.errors.model && (
            <span className="text-xs text-red-600">Invalid model</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="style">Style</label>
          <select
            id="style"
            {...form.register('style')}
            onChange={(e) => {
              form.setValue('style', e.target.value);
              handleFieldChange('style', e.target.value);
            }}
            className="h-10 rounded border border-gray-300 px-3 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="atmospheric-horror">atmospheric-horror</option>
          </select>
          {form.formState.errors.style && (
            <span className="text-xs text-red-600">Invalid style</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="count">Count</label>
          <input
            id="count"
            type="number"
            min="1"
            max="10"
            {...form.register('count', { valueAsNumber: true })}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              form.setValue('count', value);
              handleFieldChange('count', value);
            }}
            className="h-10 rounded border border-gray-300 px-3 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {form.formState.errors.count && (
            <span className="text-xs text-red-600">Invalid count</span>
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

export default function ImageGenForm() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ImageGenFormComponent />
    </QueryClientProvider>
  );
}
