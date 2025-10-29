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

// XState machine for Backstory form
interface BackstoryContext {
  origin: string;
  motivation: string;
  conflict: string;
  status: 'idle' | 'saving' | 'success' | 'error';
  error: string | null;
}

type BackstoryEvent =
  | { type: 'UPDATE_FIELD'; field: keyof BackstoryContext; value: string }
  | { type: 'SAVE' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; error: string }
  | { type: 'RESET' };

const backstoryMachine = createMachine({
  id: 'backstory',
  initial: 'idle',
  context: {
    origin: 'Tokyo underground',
    motivation: 'Find lost sister',
    conflict: 'Corporate AI',
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

function BackstoryFormComponent() {
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
  const [actor] = useState(() => createActor(backstoryMachine).start());
  const [actorState, setActorState] = useState(actor.getSnapshot());

  // Subscribe to actor state changes
  useEffect(() => {
    const subscription = actor.subscribe(setActorState);
    return () => subscription.unsubscribe();
  }, [actor]);

  const schema = nodeSchemas.Backstory;
  const form = useForm({
    resolver: valibotResolver(schema as never),
    defaultValues: {
      origin: actorState.context.origin,
      motivation: actorState.context.motivation,
      conflict: actorState.context.conflict,
    },
    mode: 'onChange',
  });

  // Update form when actor state changes
  useEffect(() => {
    form.reset({
      origin: actorState.context.origin,
      motivation: actorState.context.motivation,
      conflict: actorState.context.conflict,
    });
  }, [actorState.context.origin, actorState.context.motivation, actorState.context.conflict, form]);

  const handleFieldChange = useCallback((field: keyof BackstoryContext, value: string) => {
    actor.send({ type: 'UPDATE_FIELD', field, value });
  }, [actor]);

  const onSubmit = useCallback(async (values: { origin: string; motivation: string; conflict: string }) => {
    actor.send({ type: 'SAVE' });

    try {
      const result = await saveNodeConfig({
        nodeId: 'lore-backstory',
        nodeType: 'Backstory',
        config: values,
      });

      if (result.ok) {
        actor.send({ type: 'SAVE_SUCCESS' });

        // Notify Canvas to update nodes
        window.dispatchEvent(new CustomEvent('node-config-saved', {
          detail: { nodeId: 'lore-backstory', nodeType: 'Backstory', config: values }
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
        error: error instanceof Error ? error.message : 'Failed to save backstory config',
      });
    }
  }, [actor]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm backdrop-blur dark:bg-gray-900/80 dark:border-gray-700">
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Edit Backstory</div>
      <div className="grid grid-cols-1 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="origin">Origin</label>
          <input
            id="origin"
            type="text"
            {...form.register('origin')}
            onChange={(e) => {
              form.setValue('origin', e.target.value);
              handleFieldChange('origin', e.target.value);
            }}
            className="h-10 rounded border border-gray-300 px-3 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {form.formState.errors.origin && (
            <span className="text-xs text-red-600">Invalid origin</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="motivation">Motivation</label>
          <input
            id="motivation"
            type="text"
            {...form.register('motivation')}
            onChange={(e) => {
              form.setValue('motivation', e.target.value);
              handleFieldChange('motivation', e.target.value);
            }}
            className="h-10 rounded border border-gray-300 px-3 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {form.formState.errors.motivation && (
            <span className="text-xs text-red-600">Invalid motivation</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="conflict">Conflict</label>
          <input
            id="conflict"
            type="text"
            {...form.register('conflict')}
            onChange={(e) => {
              form.setValue('conflict', e.target.value);
              handleFieldChange('conflict', e.target.value);
            }}
            className="h-10 rounded border border-gray-300 px-3 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {form.formState.errors.conflict && (
            <span className="text-xs text-red-600">Invalid conflict</span>
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

export default function BackstoryForm() {
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
        <BackstoryFormComponent />
      </QueryClientProvider>
    </api.Provider>
  );
}
