import * as neo4j from 'neo4j-driver';
import { env } from '@/env.mjs';

let driver: neo4j.Driver | null = null;

export function getNeo4jDriver(): neo4j.Driver {
  if (!driver) {
    driver = neo4j.driver(
      env.NEO4J_URI,
      neo4j.auth.basic(env.NEO4J_USER, env.NEO4J_PASSWORD),
      {
        // Enable logging for debugging
        logging: {
          level: 'info',
          logger: (level, message) => console.log(`[${level}] ${message}`)
        }
      }
    );
  }
  return driver;
}

export async function closeNeo4jDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

export async function runQuery<T = Record<string, unknown>>(
  query: string,
  parameters?: Record<string, unknown>
): Promise<T[]> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(query, parameters);
    return result.records.map(record => record.toObject()) as T[];
  } finally {
    await session.close();
  }
}

export async function runQuerySingle<T = Record<string, unknown>>(
  query: string,
  parameters?: Record<string, unknown>
): Promise<T | null> {
  const results = await runQuery<T>(query, parameters);
  return results.length > 0 ? results[0] : null;
}
