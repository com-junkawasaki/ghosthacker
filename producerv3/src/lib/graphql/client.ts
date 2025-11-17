/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/graphql-client
 * 
 * GraphQL client configuration for Apollo Client
 */
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

let client: ApolloClient<any> | null = null;

function createClient() {
  if (typeof window === 'undefined') {
    // Server-side: return a mock client or null
    return null;
  }

  if (client) {
    return client;
  }

  const httpLink = createHttpLink({
    uri: import.meta.env.PUBLIC_GRAPHQL_API_URL || 'http://localhost:25325/graphql',
  });

  const authLink = setContext((_, { headers }) => {
    const token = localStorage.getItem('auth_token');
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
      },
    };
  });

  client = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
    ssrMode: false,
  });

  return client;
}

export const getClient = () => createClient();

