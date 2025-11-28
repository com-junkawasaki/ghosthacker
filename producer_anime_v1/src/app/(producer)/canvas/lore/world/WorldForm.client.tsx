'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { createActor, createMachine } from 'xstate';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { nodeSchemas } from '@/schemas/nodes';
import { saveNodeConfig } from '@/app/(producer)/canvas/actions';

// XState machine for World form
interface WorldContext {
  setting: string;
  era: string;
  rules: string;
  status: 'idle' | 'saving' | 'success' | 'error';
  error: string | null;
}

type WorldEvent =
  | { type: 'UPDATE_FIELD'; field: keyof WorldContext; value: string }
  | { type: 'SAVE' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; error: string }
  | { type: 'RESET' };

const worldMachine = createMachine({
  id: 'world',
  initial: 'idle',
  context: {
    setting: 'Near-future Tokyo',
    era: '2042',
    rules: 'Ghost-net protocols',
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

function WorldFormComponent() {

  // XState actor for form state management
  const [actor] = useState(() => createActor(worldMachine).start());
  const [actorState, setActorState] = useState(actor.getSnapshot());

  // Subscribe to actor state changes
  useEffect(() => {
    const subscription = actor.subscribe(setActorState);
    return () => subscription.unsubscribe();
  }, [actor]);

  const schema = nodeSchemas.World;
  const form = useForm({
    resolver: valibotResolver(schema as never),
    defaultValues: {
      setting: actorState.context.setting,
      era: actorState.context.era,
      rules: actorState.context.rules,
    },
    mode: 'onChange',
  });

  // Update form when actor state changes
  useEffect(() => {
    form.reset({
      setting: actorState.context.setting,
      era: actorState.context.era,
      rules: actorState.context.rules,
    });
  }, [actorState.context.setting, actorState.context.era, actorState.context.rules, form]);

  const handleFieldChange = useCallback((field: keyof WorldContext, value: string) => {
    actor.send({ type: 'UPDATE_FIELD', field, value });
  }, [actor]);

  const onSubmit = useCallback(async (values: { setting: string; era: string; rules: string }) => {
    actor.send({ type: 'SAVE' });

    try {
      const result = await saveNodeConfig({
        nodeId: 'lore-world',
        nodeType: 'World',
        config: values,
      });

      if (result.ok) {
        actor.send({ type: 'SAVE_SUCCESS' });

        // Notify Canvas to update nodes
        window.dispatchEvent(new CustomEvent('node-config-saved', {
          detail: { nodeId: 'lore-world', nodeType: 'World', config: values }
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
        error: error instanceof Error ? error.message : 'Failed to save world config',
      });
    }
  }, [actor]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm backdrop-blur dark:bg-gray-900/80 dark:border-gray-700">
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Edit World</div>
      <div className="grid grid-cols-1 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="setting">Setting</label>
          <input
            id="setting"
            type="text"
            {...form.register('setting')}
            onChange={(e) => {
              form.setValue('setting', e.target.value);
              handleFieldChange('setting', e.target.value);
            }}
            className="h-10 rounded border border-gray-300 px-3 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {form.formState.errors.setting && (
            <span className="text-xs text-red-600">Invalid setting</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="era">Era</label>
          <input
            id="era"
            type="text"
            {...form.register('era')}
            onChange={(e) => {
              form.setValue('era', e.target.value);
              handleFieldChange('era', e.target.value);
            }}
            className="h-10 rounded border border-gray-300 px-3 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {form.formState.errors.era && (
            <span className="text-xs text-red-600">Invalid era</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="rules">Rules</label>
          <input
            id="rules"
            type="text"
            {...form.register('rules')}
            onChange={(e) => {
              form.setValue('rules', e.target.value);
              handleFieldChange('rules', e.target.value);
            }}
            className="h-10 rounded border border-gray-300 px-3 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {form.formState.errors.rules && (
            <span className="text-xs text-red-600">Invalid rules</span>
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

export default function WorldForm() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <WorldFormComponent />
    </QueryClientProvider>
  );
}
