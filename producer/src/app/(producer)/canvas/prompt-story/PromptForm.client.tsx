'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { createActor, createMachine } from 'xstate';
import { httpBatchLink, createTRPCReact } from '@trpc/react-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import superjson from 'superjson';
import type { AppRouter } from '@/server/routers';
import { nodeSchemas } from '@/schemas/nodes';
import { saveNodeConfig } from '@/app/(producer)/canvas/actions';

// XState machine for Prompt form
interface PromptContext {
  promptType: string;
  style: string;
  genre: string;
  status: 'idle' | 'saving' | 'success' | 'error';
  error: string | null;
}

type PromptEvent =
  | { type: 'UPDATE_FIELD'; field: keyof PromptContext; value: string }
  | { type: 'SAVE' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; error: string }
  | { type: 'RESET' };

const promptMachine = createMachine({
  id: 'prompt',
  initial: 'idle',
  context: {
    promptType: 'story',
    style: 'atmospheric',
    genre: 'ghost-horror',
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

const api = createTRPCReact<AppRouter>();

function PromptFormComponent() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
        }),
      ],
    })
  );

  // XState actor for form state management
  const [actor] = useState(() => createActor(promptMachine).start());
  const [actorState, setActorState] = useState(actor.getSnapshot());

  // Subscribe to actor state changes
  useEffect(() => {
    const subscription = actor.subscribe(setActorState);
    return () => subscription.unsubscribe();
  }, [actor]);

  const schema = nodeSchemas.Prompt;
  const form = useForm({
    resolver: valibotResolver(schema as never),
    defaultValues: {
      promptType: actorState.context.promptType,
      style: actorState.context.style,
      genre: actorState.context.genre,
    },
    mode: 'onChange',
  });

  // Update form when actor state changes
  useEffect(() => {
    form.reset({
      promptType: actorState.context.promptType,
      style: actorState.context.style,
      genre: actorState.context.genre,
    });
  }, [actorState.context.promptType, actorState.context.style, actorState.context.genre, form]);

  const handleFieldChange = useCallback((field: keyof PromptContext, value: string) => {
    actor.send({ type: 'UPDATE_FIELD', field, value });
  }, [actor]);

  const onSubmit = useCallback(async (values: { promptType: string; style: string; genre: string }) => {
    actor.send({ type: 'SAVE' });

    try {
      const result = await saveNodeConfig({
        nodeId: 'prompt-story',
        nodeType: 'Prompt',
        config: values,
      });

      if (result.ok) {
        actor.send({ type: 'SAVE_SUCCESS' });

        // Notify Canvas to update nodes
        window.dispatchEvent(new CustomEvent('node-config-saved', {
          detail: { nodeId: 'prompt-story', nodeType: 'Prompt', config: values }
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
        error: error instanceof Error ? error.message : 'Failed to save prompt config',
      });
    }
  }, [actor]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm backdrop-blur dark:bg-gray-900/80 dark:border-gray-700">
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Edit Prompt</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="promptType">Prompt Type</label>
          <select
            id="promptType"
            {...form.register('promptType')}
            onChange={(e) => {
              form.setValue('promptType', e.target.value);
              handleFieldChange('promptType', e.target.value);
            }}
            className="h-10 rounded border border-gray-300 px-3 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="story">story</option>
          </select>
          {form.formState.errors.promptType && (
            <span className="text-xs text-red-600">Invalid prompt type</span>
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
            <option value="atmospheric">atmospheric</option>
          </select>
          {form.formState.errors.style && (
            <span className="text-xs text-red-600">Invalid style</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="genre">Genre</label>
          <select
            id="genre"
            {...form.register('genre')}
            onChange={(e) => {
              form.setValue('genre', e.target.value);
              handleFieldChange('genre', e.target.value);
            }}
            className="h-10 rounded border border-gray-300 px-3 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="ghost-horror">ghost-horror</option>
          </select>
          {form.formState.errors.genre && (
            <span className="text-xs text-red-600">Invalid genre</span>
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

export default function PromptForm() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <PromptFormComponent />
      </QueryClientProvider>
    </api.Provider>
  );
}
