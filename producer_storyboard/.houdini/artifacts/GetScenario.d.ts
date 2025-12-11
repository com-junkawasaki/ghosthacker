export type GetScenario = {
    readonly "input": GetScenario$input;
    readonly "result": GetScenario$result | undefined;
};

export type GetScenario$result = {
    readonly scenario: {
        readonly id: string;
        readonly projectId: string;
        readonly title: string;
        readonly description: string | null;
        readonly createdAt: string;
        readonly updatedAt: string;
        readonly episodes: ({
            readonly id: string;
            readonly scenarioId: string;
            readonly title: string;
            readonly description: string | null;
            readonly orderIndex: number;
            readonly createdAt: string;
            readonly updatedAt: string;
            readonly parts: ({
                readonly id: string;
                readonly episodeId: string;
                readonly title: string;
                readonly description: string | null;
                readonly orderIndex: number;
                readonly createdAt: string;
                readonly updatedAt: string;
                readonly scenePlans: ({
                    readonly id: string;
                    readonly partId: string;
                    readonly description: string;
                    readonly orderIndex: number;
                    readonly createdAt: string;
                    readonly updatedAt: string;
                })[];
            })[];
        })[];
    } | null;
};

export type GetScenario$input = {
    id: string | number;
};

export type GetScenario$artifact = {
    "name": "GetScenario";
    "kind": "HoudiniQuery";
    "hash": "efa4b97e31087a46bd99faa7b0eaca950893f3c2374a4b4aa75ccf855f54c26e";
    "raw": `query GetScenario($id: ID!) {
  scenario(id: $id) {
    id
    projectId
    title
    description
    createdAt
    updatedAt
    episodes {
      id
      scenarioId
      title
      description
      orderIndex
      createdAt
      updatedAt
      parts {
        id
        episodeId
        title
        description
        orderIndex
        createdAt
        updatedAt
        scenePlans {
          id
          partId
          description
          orderIndex
          createdAt
          updatedAt
        }
      }
    }
  }
}`;
    "rootType": "Query";
    "stripVariables": [];
    "selection": {
        "fields": {
            "scenario": {
                "type": "Scenario";
                "keyRaw": "scenario(id: $id)";
                "nullable": true;
                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID";
                            "keyRaw": "id";
                            "visible": true;
                        };
                        "projectId": {
                            "type": "ID";
                            "keyRaw": "projectId";
                            "visible": true;
                        };
                        "title": {
                            "type": "String";
                            "keyRaw": "title";
                            "visible": true;
                        };
                        "description": {
                            "type": "String";
                            "keyRaw": "description";
                            "nullable": true;
                            "visible": true;
                        };
                        "createdAt": {
                            "type": "String";
                            "keyRaw": "createdAt";
                            "visible": true;
                        };
                        "updatedAt": {
                            "type": "String";
                            "keyRaw": "updatedAt";
                            "visible": true;
                        };
                        "episodes": {
                            "type": "Episode";
                            "keyRaw": "episodes";
                            "selection": {
                                "fields": {
                                    "id": {
                                        "type": "ID";
                                        "keyRaw": "id";
                                        "visible": true;
                                    };
                                    "scenarioId": {
                                        "type": "ID";
                                        "keyRaw": "scenarioId";
                                        "visible": true;
                                    };
                                    "title": {
                                        "type": "String";
                                        "keyRaw": "title";
                                        "visible": true;
                                    };
                                    "description": {
                                        "type": "String";
                                        "keyRaw": "description";
                                        "nullable": true;
                                        "visible": true;
                                    };
                                    "orderIndex": {
                                        "type": "Int";
                                        "keyRaw": "orderIndex";
                                        "visible": true;
                                    };
                                    "createdAt": {
                                        "type": "String";
                                        "keyRaw": "createdAt";
                                        "visible": true;
                                    };
                                    "updatedAt": {
                                        "type": "String";
                                        "keyRaw": "updatedAt";
                                        "visible": true;
                                    };
                                    "parts": {
                                        "type": "Part";
                                        "keyRaw": "parts";
                                        "selection": {
                                            "fields": {
                                                "id": {
                                                    "type": "ID";
                                                    "keyRaw": "id";
                                                    "visible": true;
                                                };
                                                "episodeId": {
                                                    "type": "ID";
                                                    "keyRaw": "episodeId";
                                                    "visible": true;
                                                };
                                                "title": {
                                                    "type": "String";
                                                    "keyRaw": "title";
                                                    "visible": true;
                                                };
                                                "description": {
                                                    "type": "String";
                                                    "keyRaw": "description";
                                                    "nullable": true;
                                                    "visible": true;
                                                };
                                                "orderIndex": {
                                                    "type": "Int";
                                                    "keyRaw": "orderIndex";
                                                    "visible": true;
                                                };
                                                "createdAt": {
                                                    "type": "String";
                                                    "keyRaw": "createdAt";
                                                    "visible": true;
                                                };
                                                "updatedAt": {
                                                    "type": "String";
                                                    "keyRaw": "updatedAt";
                                                    "visible": true;
                                                };
                                                "scenePlans": {
                                                    "type": "ScenePlan";
                                                    "keyRaw": "scenePlans";
                                                    "selection": {
                                                        "fields": {
                                                            "id": {
                                                                "type": "ID";
                                                                "keyRaw": "id";
                                                                "visible": true;
                                                            };
                                                            "partId": {
                                                                "type": "ID";
                                                                "keyRaw": "partId";
                                                                "visible": true;
                                                            };
                                                            "description": {
                                                                "type": "String";
                                                                "keyRaw": "description";
                                                                "visible": true;
                                                            };
                                                            "orderIndex": {
                                                                "type": "Int";
                                                                "keyRaw": "orderIndex";
                                                                "visible": true;
                                                            };
                                                            "createdAt": {
                                                                "type": "String";
                                                                "keyRaw": "createdAt";
                                                                "visible": true;
                                                            };
                                                            "updatedAt": {
                                                                "type": "String";
                                                                "keyRaw": "updatedAt";
                                                                "visible": true;
                                                            };
                                                        };
                                                    };
                                                    "visible": true;
                                                };
                                            };
                                        };
                                        "visible": true;
                                    };
                                };
                            };
                            "visible": true;
                        };
                    };
                };
                "visible": true;
            };
        };
    };
    "pluginData": {
        "houdini-svelte": {};
    };
    "input": {
        "fields": {
            "id": "ID";
        };
        "types": {};
        "defaults": {};
        "runtimeScalars": {};
    };
    "policy": "CacheOrNetwork";
    "partial": false;
};