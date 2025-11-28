import { getNeo4jDriver } from '@/infra/neo4j/client';

async function main() {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    console.log('Creating ghost-hacker-project...');

    // まず既存のプロジェクトを確認
    const existingResult = await session.run(
      'MATCH (p:Project {id: $id}) RETURN p',
      { id: 'ghost-hacker-project' }
    );

    if (existingResult.records.length > 0) {
      console.log('Project already exists:', existingResult.records[0].get('p').properties);
      return;
    }

    // プロジェクトを作成
    const now = new Date().toISOString();
    const createResult = await session.run(
      `MERGE (p:Project {id: $id})
       ON CREATE SET p += $props
       ON MATCH SET p += $updateProps
       RETURN p`,
      {
        id: 'ghost-hacker-project',
        props: {
          title: 'Ghost Hacker Producer',
          logline: 'A ghost hacker helps clients integrate their digital ghosts, blending episodic healing with a larger mystery surrounding the Tree of Life.',
          genres: ['supernatural', 'drama', 'mystery'],
          tone: 'atmospheric',
          audienceRating: 'PG-13',
          language: 'en',
          keywords: ['ghost', 'hacker', 'digital afterlife', 'healing', 'mystery'],
          createdAt: now,
          updatedAt: now,
        },
        updateProps: {
          updatedAt: now,
        }
      }
    );

    console.log('Project created:', createResult.records[0].get('p').properties);

    // 既存のエピソードを新しいプロジェクトに接続し直す
    console.log('Migrating existing episodes to ghost-hacker-project...');

    // 既存のエピソードをすべて取得
    const episodesResult = await session.run(`
      MATCH (e:Episode)
      WHERE e.id =~ 'urn:gh:episode:.*'
      RETURN e
    `);

    console.log(`Found ${episodesResult.records.length} episodes to migrate`);

    // 各エピソードを新しいプロジェクトに接続
    for (const record of episodesResult.records) {
      const episodeProps = record.get('e').properties;
      const episodeId = episodeProps.id;

      // 既存のリレーションを削除してから新しいリレーションを作成
      await session.run(`
        MATCH (p:Project)-[r:HAS_EPISODE]->(e:Episode {id: $episodeId})
        DELETE r
      `, { episodeId });

      // 新しいプロジェクトに接続
      await session.run(`
        MATCH (p:Project {id: $projectId}), (e:Episode {id: $episodeId})
        MERGE (p)-[:HAS_EPISODE]->(e)
      `, { projectId: 'ghost-hacker-project', episodeId });
    }

    console.log('Episodes migrated to ghost-hacker-project');

    // 確認
    const finalResult = await session.run(`
      MATCH (p:Project {id: $projectId})-[:HAS_EPISODE]->(e:Episode)
      RETURN count(e) as count
    `, { projectId: 'ghost-hacker-project' });

    console.log('Final episodes count:', finalResult.records[0].get('count').toNumber());

  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
