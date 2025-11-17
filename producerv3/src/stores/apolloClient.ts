/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/apollo-client-store
 * 
 * Apollo Client state management using Zustand
 */
import { create } from 'zustand';
import type { ApolloClient } from '@apollo/client';
import type { NormalizedCacheObject } from '@apollo/client';
import { getClient } from '@/lib/graphql/client';

type ApolloClientState = 
  | { status: 'idle'; client: null }
  | { status: 'loading'; client: null }
  | { status: 'ready'; client: ApolloClient<NormalizedCacheObject> }
  | { status: 'error'; client: null; error: Error };

interface ApolloClientStore {
  state: ApolloClientState;
  initialize: () => void;
  getClient: () => ApolloClient<NormalizedCacheObject> | null;
}

export const useApolloClientStore = create<ApolloClientStore>((set, get) => {
  const initialize = () => {
    const currentState = get().state;
    if (currentState.status !== 'idle') {
      return; // Already initialized or initializing
    }

    if (typeof window === 'undefined') {
      return; // Server-side: do nothing
    }

    set({ state: { status: 'loading', client: null } });

    try {
      const client = getClient();
      if (client) {
        set({ state: { status: 'ready', client } });
      } else {
        set({ 
          state: { 
            status: 'error', 
            client: null, 
            error: new Error('Failed to initialize Apollo Client') 
          } 
        });
      }
    } catch (error) {
      set({ 
        state: { 
          status: 'error', 
          client: null, 
          error: error instanceof Error ? error : new Error('Unknown error') 
        } 
      });
    }
  };

  return {
    state: { status: 'idle', client: null },
    initialize,
    getClient: () => {
      const state = get().state;
      return state.status === 'ready' ? state.client : null;
    },
  };
});

