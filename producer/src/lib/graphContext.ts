import { getNeo4jDriver } from "@/infra/neo4j/client";

type GenericNode = { id: string; type: string; label?: string; config?: Record<string, unknown> };

export function createGraphContext() {
  const driver = getNeo4jDriver();

  async function fetchCharacterBundle(name: string) {
    const session = driver.session();
    try {
      const cypher = `MATCH (c:Character {name: $name}) RETURN c LIMIT 1`;
      const r = await session.run(cypher, { name });
      return r.records[0]?.toObject() ?? null;
    } finally {
      await session.close();
    }
  }

  return {
    // Context builders for RAG/prompts per modality
    async buildTextContext(_n: GenericNode) { return { lore: await fetchCharacterBundle("Akito") }; },
    async buildImageContext(_n: GenericNode) { return { style: "atmospheric-horror" }; },
    async buildAudioContext(_n: GenericNode) { return { voice: "alloy" }; },
    async buildVideoContext(_n: GenericNode) { return { duration: 300, aspect: "9:16" }; },
    async buildPanelContext(_n: GenericNode) { return {}; },
    async buildLayoutContext(_n: GenericNode) { return {}; },
    async buildWebtoonExportContext(_n: GenericNode) { return {}; },
    async buildRenderContext(_n: GenericNode) { return {}; },
    async buildWattpadContext(_n: GenericNode) { return { includeImages: true }; },
    async buildYouTubeContext(_n: GenericNode) { return { privacy: "unlisted" }; },

    // Node persistence/derivation placeholders
    async upsertCharacter(n: GenericNode) {
      const session = driver.session();
      try {
        const id = n.id;
        const name = (n.config?.["name"] as string) ?? "Akito";
        const q = `MERGE (c:Character {id: $id}) SET c.name = $name, c.updatedAt = datetime() RETURN c`;
        const r = await session.run(q, { id, name });
        return { name: r.records[0]?.get("c").properties.name };
      } finally {
        await session.close();
      }
    },
    async upsertBackstory(n: GenericNode) {
      const session = driver.session();
      try {
        const id = n.id;
        const origin = (n.config?.["origin"] as string) ?? "";
        const motivation = (n.config?.["motivation"] as string) ?? "";
        const conflict = (n.config?.["conflict"] as string) ?? "";
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
        const setting = (n.config?.["setting"] as string) ?? "Near-future Tokyo";
        const era = (n.config?.["era"] as string) ?? "2042";
        const rules = (n.config?.["rules"] as string) ?? "Ghost-net protocols";
        const q = `MERGE (w:World {id: $id}) SET w += { setting: $setting, era: $era, rules: $rules, updatedAt: datetime() } RETURN w`;
        await session.run(q, { id, setting, era, rules });
        return { setting, era, rules };
      } finally {
        await session.close();
      }
    },
    async loadSource(n: GenericNode) {
      const draft = { ok: true };
      return { draft };
    },
    async composePrompt(n: GenericNode) {
      const prompt = { type: n.type, style: n.config?.["style"] ?? "atmospheric" };
      return { prompt };
    },
  };
}


