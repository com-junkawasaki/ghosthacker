/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/graphql-client
 * 
 * Apollo Provider wrapper component using Zustand
 */
import { ApolloProvider as ApolloProviderBase } from '@apollo/client';
import { useApolloClientStore } from '../../stores/apolloClient';

interface ApolloProviderProps {
  children: React.ReactNode;
}

export function ApolloProvider({ children }: ApolloProviderProps) {
  const state = useApolloClientStore((store) => store.state);
  const initialize = useApolloClientStore((store) => store.initialize);

  // Ensure initialization on client side
  if (typeof window !== 'undefined' && state.status === 'idle') {
    initialize();
  }

  // Pattern matching using Zustand state
  if (state.status === 'idle') {
    return <div>Initializing...</div>;
  }

  if (state.status === 'loading') {
    return <div>Loading Apollo Client...</div>;
  }

  if (state.status === 'ready') {
    return <ApolloProviderBase client={state.client}>{children}</ApolloProviderBase>;
  }

  if (state.status === 'error') {
    return <div>Error: {state.error.message}</div>;
  }

  return <div>Unknown state</div>;
}

