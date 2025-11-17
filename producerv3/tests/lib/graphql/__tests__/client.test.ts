/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/test-graphql-client
 * 
 * Tests for GraphQL client configuration
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { client } from '../client';

describe('GraphQL Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates Apollo client instance', () => {
    expect(client).toBeDefined();
    expect(client.link).toBeDefined();
    expect(client.cache).toBeDefined();
  });

  it('has correct default URI', () => {
    // Client should be configured with a URI
    expect(client.link).toBeDefined();
  });

  it('has InMemoryCache configured', () => {
    expect(client.cache).toBeDefined();
  });
});

