/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/jsonld-context
 * 
 * JSON-LDコンテキスト定義
 * episode_bible.jsonldとghost-hacker.jsonldから抽出
 */

export const JSONLD_CONTEXT = {
  '@base': 'https://ghosthacker.junkawasaki.com/ghost-hacker/',
  '@vocab': 'https://schema.org/',
  schema: 'https://schema.org/',
  gh: 'https://ghosthacker.junkawasaki.com/gh#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  owl: 'http://www.w3.org/2002/07/owl#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  foaf: 'http://xmlns.com/foaf/0.1/',
  dc: 'http://purl.org/dc/terms/',
  skos: 'http://www.w3.org/2004/02/skos/core#',
} as const;

/**
 * ノードIDの生成規則
 */
export const NODE_ID_PREFIXES = {
  character: 'character:',
  ghost: 'ghost:',
  location: 'setting:',
  organization: 'organization:',
  company: 'company:',
  technology: 'tech:',
  episode: 'gh:Episode/',
  scene: 'gh:Scene/',
  arc: 'gh:Arc/',
  motif: 'gh:Motif/',
  season: 'gh:Season/',
  timeline: 'gh:Timeline/',
  sourceRef: 'gh:Source/',
  event: 'event:',
  occupation: 'occupation:',
  setting: 'setting:',
} as const;

/**
 * ノードIDを生成
 */
export function generateNodeId(
  type: keyof typeof NODE_ID_PREFIXES,
  identifier: string
): string {
  const prefix = NODE_ID_PREFIXES[type];
  return `${prefix}${identifier}`;
}

/**
 * ノードIDをパース
 */
export function parseNodeId(nodeId: string): {
  type: keyof typeof NODE_ID_PREFIXES | null;
  identifier: string;
} {
  for (const [type, prefix] of Object.entries(NODE_ID_PREFIXES)) {
    if (nodeId.startsWith(prefix)) {
      return {
        type: type as keyof typeof NODE_ID_PREFIXES,
        identifier: nodeId.slice(prefix.length),
      };
    }
  }
  return { type: null, identifier: nodeId };
}

/**
 * JSON-LDコンテキストオブジェクトを生成
 */
export function createJsonLdContext() {
  return {
    '@context': {
      '@base': JSONLD_CONTEXT['@base'],
      '@vocab': JSONLD_CONTEXT['@vocab'],
      schema: JSONLD_CONTEXT.schema,
      gh: JSONLD_CONTEXT.gh,
      rdf: JSONLD_CONTEXT.rdf,
      rdfs: JSONLD_CONTEXT.rdfs,
      owl: JSONLD_CONTEXT.owl,
      xsd: JSONLD_CONTEXT.xsd,
      foaf: JSONLD_CONTEXT.foaf,
      dc: JSONLD_CONTEXT.dc,
      skos: JSONLD_CONTEXT.skos,

      // ノードタイプ
      Season: 'gh:Season',
      Episode: 'gh:Episode',
      Arc: 'gh:Arc',
      Scene: 'gh:Scene',
      Motif: 'gh:Motif',
      Timeline: 'gh:Timeline',
      SourceRef: 'gh:SourceRef',
      Person: 'schema:Person',
      Organization: 'schema:Organization',
      Place: 'schema:Place',
      Intangible: 'schema:Intangible',
      Event: 'schema:Event',
      CreativeWork: 'schema:CreativeWork',

      // プロパティ
      name: { '@id': 'schema:name', '@type': 'xsd:string' },
      description: { '@id': 'schema:description', '@type': 'xsd:string' },
      alternateName: { '@id': 'schema:alternateName', '@type': 'xsd:string' },
      sameAs: { '@id': 'schema:sameAs', '@type': '@id' },
      age: { '@id': 'schema:age', '@type': 'xsd:integer' },
      occupation: { '@id': 'schema:occupation', '@type': 'xsd:string' },
      knows: { '@id': 'schema:knows', '@type': '@id' },
      worksFor: { '@id': 'schema:worksFor', '@type': '@id' },
      founder: { '@id': 'schema:founder', '@type': '@id' },
      parent: { '@id': 'schema:parent', '@type': '@id' },
      spouse: { '@id': 'schema:spouse', '@type': '@id' },
      sibling: { '@id': 'schema:sibling', '@type': '@id' },
      colleague: { '@id': 'schema:colleague', '@type': '@id' },

      // Ghost Hacker固有プロパティ
      'gh:theme': { '@type': 'xsd:string' },
      'gh:season': { '@type': '@id' },
      'gh:episodeNumber': { '@type': 'xsd:integer' },
      'gh:logline': { '@type': 'xsd:string' },
      'gh:hasArc': { '@type': '@id' },
      'gh:hasScene': { '@type': '@id' },
      'gh:hasCharacter': { '@type': '@id' },
      'gh:motifRefs': { '@type': '@id' },
      'gh:featuredThemes': {},
      'gh:source': { '@type': '@id' },
      'gh:path': { '@type': 'xsd:string' },
      'gh:lang': { '@type': 'xsd:string' },
      'gh:selectionHint': { '@type': 'xsd:string' },
      'gh:flashbackOf': { '@type': '@id' },
      'gh:influences': { '@type': '@id' },
      'gh:antagonist': { '@type': '@id' },
      'gh:spansSeasons': { '@type': '@id' },
      'gh:phase': { '@type': 'xsd:string' },
      'gh:virtue': { '@type': 'xsd:string' },
      'gh:anchoredTo': { '@type': '@id' },
      'gh:emits': { '@type': '@id' },
      'gh:repels': { '@type': '@id' },
      'gh:avoids': { '@type': '@id' },
      'gh:ghost': { '@type': '@id' },
      'gh:Ghost': { '@id': 'gh:Ghost', '@type': 'rdfs:Class' },
      'gh:ghostType': { '@type': 'xsd:string' },
      'gh:master': { '@type': '@id' },
      'gh:createdBy': { '@type': '@id' },
      'gh:year': { '@type': 'xsd:gYear' },
      'gh:callsign': { '@type': 'xsd:string' },
      'gh:persona': { '@type': 'xsd:string' },
      'gh:infraNote': { '@type': 'xsd:string' },
      'gh:operationalNote': { '@type': 'xsd:string' },
      'gh:securityNote': { '@type': 'xsd:string' },
      'gh:hazardNote': { '@type': 'xsd:string' },
      'gh:items': { '@id': 'gh:items', '@type': '@id' },
      'gh:role': { '@type': 'xsd:string' },
      'gh:relatesTo': { '@id': 'gh:relatesTo', '@type': '@id' },
      'gh:relationshipType': { '@id': 'gh:relationshipType', '@type': 'xsd:string' },
      'gh:companyType': { '@type': 'xsd:string' },
      'gh:location': { '@type': '@id' },
      'gh:certification': { '@type': '@id' },
      'gh:context': {},
      'gh:sessionBookedBy': { '@type': '@id' },
      'gh:promptingStyle': { '@type': 'xsd:string' },
      'gh:disclosurePolicy': { '@type': 'xsd:string' },
      'gh:familyContrast': {},
      'gh:familySupport': { '@type': 'xsd:boolean' },
      'gh:familyIssue': { '@type': 'xsd:string' },
      'gh:emotionalPlan': {},
      'gh:EmotionalPlan': {},
      'gh:beats': {},
      'gh:EmotionalBeat': {},
      'gh:position': { '@type': 'xsd:integer' },
      'gh:targetEmotions': {},
    },
  };
}

