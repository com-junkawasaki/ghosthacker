const { createTRPCClient, httpBatchLink } = require('@trpc/client');
const superjson = require('superjson');

const client = createTRPCClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
      transformer: superjson,
    }),
  ],
});

async function testEpisodes() {
  try {
    // First, try to load episodes
    console.log('Loading episodes...');
    const episodes = await client.story.loadEpisodes.query();
    console.log('Loaded episodes:', episodes);

    // Then, try to submit a test episode
    console.log('Submitting test episode...');
    const testEpisode = {
      "@id": "test-episode-1",
      "@type": "gh:Episode",
      "schema:name": "Test Episode",
      "schema:episodeNumber": "1",
      "gh:hasPart": [{
        "@type": "schema:TextDigitalDocument",
        "schema:contentUrl": "test.txt",
        "schema:name": "Test Document"
      }]
    };

    const result = await client.story.submitEpisodes.mutate([testEpisode]);
    console.log('Submit result:', result);

    // Load again to verify
    console.log('Loading episodes again...');
    const episodesAfter = await client.story.loadEpisodes.query();
    console.log('Episodes after submit:', episodesAfter);

  } catch (error) {
    console.error('Error:', error);
  }
}

testEpisodes();
