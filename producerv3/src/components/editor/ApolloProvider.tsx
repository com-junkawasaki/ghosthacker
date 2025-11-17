/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/graphql-client
 * 
 * Apollo Provider wrapper component
 */
import { client } from '../../lib/graphql/client';
// @ts-ignore - Apollo Client CommonJS import workaround
import pkg from '@apollo/client';
const { ApolloProvider: ApolloProviderBase } = pkg;

interface ApolloProviderProps {
  children: React.ReactNode;
}

export function ApolloProvider({ children }: ApolloProviderProps) {
  return <ApolloProviderBase client={client}>{children}</ApolloProviderBase>;
}

