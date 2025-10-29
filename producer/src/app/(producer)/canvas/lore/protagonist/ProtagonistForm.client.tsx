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

// XState machine for Protagonist form
interface ProtagonistContext {
  name: string;
  role: string;
  traits: string;
  status: 'idle' | 'saving' | 'success' | 'error';
  error: string | null;
}

type ProtagonistEvent =
  | { type: 'UPDATE_FIELD'; field: keyof ProtagonistContext; value: string }
  | { type: 'SAVE' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; error: string }
  | { type: 'RESET' };

const protagonistMachine = createMachine({
  id: 'protagonist',
  initial: 'idle',
  context: {
    name: 'Akito',
    role: 'Hacker',
    traits: 'Stoic, Empathic',
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

function ProtagonistFormComponent() {
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
  const [actor] = useState(() => createActor(protagonistMachine).start());
  const [actorState, setActorState] = useState(actor.getSnapshot());

  // Subscribe to actor state changes
  useEffect(() => {
    const subscription = actor.subscribe(setActorState);
    return () => subscription.unsubscribe();
  }, [actor]);

  const schema = nodeSchemas.Protagonist;
  const form = useForm({
    resolver: valibotResolver(schema as never),
    defaultValues: {
      name: actorState.context.name,
      role: actorState.context.role,
      traits: actorState.context.traits,
    },
    mode: 'onChange',
  });

  // Update form when actor state changes
  useEffect(() => {
    form.reset({
      name: actorState.context.name,
      role: actorState.context.role,
      traits: actorState.context.traits,
    });
  }, [actorState.context.name, actorState.context.role, actorState.context.traits, form]);

  const handleFieldChange = useCallback((field: keyof ProtagonistContext, value: string) => {
    actor.send({ type: 'UPDATE_FIELD', field, value });
  }, [actor]);

  const onSubmit = useCallback(async (values: { name: string; role: string; traits: string }) => {
    actor.send({ type: 'SAVE' });

    try {
      const result = await saveNodeConfig({
        nodeId: 'lore-protagonist',
        nodeType: 'Protagonist',
        config: values,
      });

      if (result.ok) {
        actor.send({ type: 'SAVE_SUCCESS' });

        // Notify Canvas to update nodes
        window.dispatchEvent(new CustomEvent('node-config-saved', {
          detail: { nodeId: 'lore-protagonist', nodeType: 'Protagonist', config: values }
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
        error: error instanceof Error ? error.message : 'Failed to save protagonist config',
      });
    }
  }, [actor]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm backdrop-blur dark:bg-gray-900/80 dark:border-gray-700">
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Edit Protagonist</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            {...form.register('name')}
            onChange={(e) => {
              form.setValue('name', e.target.value);
              handleFieldChange('name', e.target.value);
            }}
            className="h-10 rounded border border-gray-300 px-3 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {form.formState.errors.name && (
            <span className="text-xs text-red-600">Invalid name</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="role">Role</label>
          <input
            id="role"
            type="text"
            {...form.register('role')}
            onChange={(e) => {
              form.setValue('role', e.target.value);
              handleFieldChange('role', e.target.value);
            }}
            className="h-10 rounded border border-gray-300 px-3 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {form.formState.errors.role && (
            <span className="text-xs text-red-600">Invalid role</span>
          )}
        </div>

        <div className="md:col-span-2 flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="traits">Traits</label>
          <input
            id="traits"
            type="text"
            {...form.register('traits')}
            onChange={(e) => {
              form.setValue('traits', e.target.value);
              handleFieldChange('traits', e.target.value);
            }}
            className="h-10 rounded border border-gray-300 px-3 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {form.formState.errors.traits && (
            <span className="text-xs text-red-600">Invalid traits</span>
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

export default function ProtagonistForm() {
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
        <ProtagonistFormComponent />
      </QueryClientProvider>
    </api.Provider>
  );
}
