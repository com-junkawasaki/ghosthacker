/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/graphql-client
 * 
 * Apollo Provider wrapper component
 */
import { client } from '../../lib/graphql/client';
import { ApolloProvider as ApolloProviderBase } from '@apollo/client';

interface ApolloProviderProps {
  children: React.ReactNode;
}

export function ApolloProvider({ children }: ApolloProviderProps) {
  return <ApolloProviderBase client={client}>{children}</ApolloProviderBase>;
}

