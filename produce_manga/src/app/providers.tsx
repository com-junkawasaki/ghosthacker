/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/actor/manga-editor
 * 
 * Providers for Apollo Client
 */
'use client';

import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '@/lib/graphql/client';

export function Providers({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}

