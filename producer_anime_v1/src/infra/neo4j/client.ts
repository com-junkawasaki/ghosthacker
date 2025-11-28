import neo4j from 'neo4j-driver';
import type { Driver } from 'neo4j-driver';
import { env } from '@/env';

let driver: Driver | null = null;

export function getNeo4jDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(env.NEO4J_URI, neo4j.auth.basic(env.NEO4J_USER, env.NEO4J_PASSWORD));
  }
  return driver;
}

export async function closeNeo4jDriver() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}


