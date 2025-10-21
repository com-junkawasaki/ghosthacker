import { getNeo4jDriver } from "@/infra/neo4j/client";
import { Node } from "@reactflow/core";

type GenericNode = Node;

export function createGraphContext() {
  const driver = getNeo4jDriver();

  async function fetchCharacterBundle(name: string) {
    const session = driver.session();
    try {
      const cypher = `MATCH (c:Character {name: $name}) RETURN c LIMIT 1`;
      const r = await session.run(cypher, { name });
      const record = r.records[0]?.get("c");
      return record ? record.properties : null;
    } finally {
      await session.close();
    }
  }

  return {
    // Context builders for RAG/prompts per modality
    async buildTextContext(_n: GenericNode, _inputs: Record<string, unknown>) { return { lore: await fetchCharacterBundle("Akito") }; },
    async buildImageContext(_n: GenericNode, _inputs: Record<string, unknown>) { return { style: "atmospheric-horror" }; },
    async buildAudioContext(_n: GenericNode, _inputs: Record<string, unknown>) { return { voice: "alloy" }; },
    async buildVideoContext(_n: GenericNode, _inputs: Record<string, unknown>) { return { duration: 300, aspect: "9:16" }; },
    async buildPanelContext(_n: GenericNode, _inputs: Record<string, unknown>) { return {}; },
    async buildLayoutContext(_n: GenericNode, _inputs: Record<string, unknown>) { return {}; },
    async buildWebtoonExportContext(_n: GenericNode, _inputs: Record<string, unknown>) { return {}; },
    async buildRenderContext(_n: GenericNode, _inputs: Record<string, unknown>) { return {}; },
    async buildWattpadContext(_n: GenericNode, _inputs: Record<string, unknown>) { return { includeImages: true }; },
    async buildYouTubeContext(_n: GenericNode, _inputs: Record<string, unknown>) { return { privacy: "unlisted" }; },

    // Node persistence/derivation placeholders
    async upsertCharacter(n: GenericNode) {
      const session = driver.session();
      try {
        const id = n.id;
        const name = (n.data?.config?.name as string) ?? "Akito";
        const q = `MERGE (c:Character {id: $id}) SET c.name = $name, c.updatedAt = datetime() RETURN c`;
        const r = await session.run(q, { id, name });
        const record = r.records[0]?.get("c");
        return { name: record ? record.properties.name : 'unknown' };
      } finally {
        await session.close();
      }
    },
    async upsertBackstory(n: GenericNode) {
      const session = driver.session();
      try {
        const id = n.id;
        const origin = (n.data?.config?.origin as string) ?? "";
        const motivation = (n.data?.config?.motivation as string) ?? "";
        const conflict = (n.data?.config?.conflict as string) ?? "";
        const q = `MERGE (b:Backstory {id: $id}) SET b += { origin: $origin, motivation: $motivation, conflict: $conflict, updatedAt: datetime() } RETURN b`;
        await session.run(q, { id, origin, motivation, conflict });
        return { origin, motivation, conflict };
      } finally {
        await session.close();
      }
    },
    async upsertWorld(n: GenericNode) {
      const session = driver.session();
      try {
        const id = n.id;
        const setting = (n.data?.config?.setting as string) ?? "Near-future Tokyo";
        const era = (n.data?.config?.era as string) ?? "2042";
        const rules = (n.data?.config?.rules as string) ?? "Ghost-net protocols";
        const q = `MERGE (w:World {id: $id}) SET w += { setting: $setting, era: $era, rules: $rules, updatedAt: datetime() } RETURN w`;
        await session.run(q, { id, setting, era, rules });
        return { setting, era, rules };
      } finally {
        await session.close();
      }
    },
    async loadSource(_n: GenericNode) {
      const draft = { ok: true };
      return { draft };
    },
    async composePrompt(n: GenericNode, inputs: Record<string, unknown>) {
      const prompt = { type: n.type, style: n.data?.config?.style ?? "atmospheric", inputs };
      return { prompt };
    },
  };
}


