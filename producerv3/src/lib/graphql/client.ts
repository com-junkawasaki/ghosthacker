/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/graphql-client
 * 
 * GraphQL client configuration for Apollo Client
 */
// @ts-ignore - Apollo Client CommonJS import workaround
import * as ApolloClientPkg from '@apollo/client';
// @ts-ignore - Apollo Client CommonJS import workaround
import * as ApolloClientContextPkg from '@apollo/client/link/context';

const ApolloClient = (ApolloClientPkg as any).ApolloClient || (ApolloClientPkg as any).default?.ApolloClient;
const InMemoryCache = (ApolloClientPkg as any).InMemoryCache || (ApolloClientPkg as any).default?.InMemoryCache;
const createHttpLink = (ApolloClientPkg as any).createHttpLink || (ApolloClientPkg as any).default?.createHttpLink;
const setContext = (ApolloClientContextPkg as any).setContext || (ApolloClientContextPkg as any).default?.setContext;

const httpLink = createHttpLink({
  uri: import.meta.env.PUBLIC_GRAPHQL_API_URL || 'http://localhost:8080/graphql',
});

const authLink = setContext((_, { headers }) => {
  // TODO: Add Clerk token to headers
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

