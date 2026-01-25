/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/graphql-client
 * 
 * GraphQL client configuration for Apollo Client
 */
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import type { NormalizedCacheObject } from '@apollo/client';

let client: ApolloClient<NormalizedCacheObject> | null = null;

function createClient() {
  if (typeof window === 'undefined') {
    // Server-side: return a mock client or null
    return null;
  }

  if (client) {
    return client;
  }

  const httpLink = createHttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_API_URL || 'http://localhost:25325/graphql',
  });

  // No authentication for now (per user choice)
  client = new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(),
    ssrMode: false,
  });

  return client;
}

export const getClient = () => createClient();

