export type CreateEpisode = {
    readonly "input": CreateEpisode$input;
    readonly "result": CreateEpisode$result;
};

export type CreateEpisode$result = {
    readonly createEpisode: {
        readonly id: string;
        readonly scenarioId: string;
        readonly title: string;
        readonly description: string | null;
        readonly orderIndex: number;
        readonly createdAt: string;
        readonly updatedAt: string;
    };
};

type CreateEpisodeInput = {
    scenarioId: string | number;
    title: string;
    description?: string | null | undefined;
    orderIndex?: number | null | undefined;
};

export type CreateEpisode$input = {
    input: CreateEpisodeInput;
};

export type CreateEpisode$optimistic = {
    readonly createEpisode?: {
        readonly id?: string;
        readonly scenarioId?: string;
        readonly title?: string;
        readonly description?: string | null;
        readonly orderIndex?: number;
        readonly createdAt?: string;
        readonly updatedAt?: string;
    };
};

export type CreateEpisode$artifact = {
    "name": "CreateEpisode";
    "kind": "HoudiniMutation";
    "hash": "b0a0ed9e4893b679ca30933e6f3af6bb0ed6e87676bd61967dd30c11f17c991b";
    "raw": `mutation CreateEpisode($input: CreateEpisodeInput!) {
  createEpisode(input: $input) {
    id
    scenarioId
    title
    description
    orderIndex
    createdAt
    updatedAt
  }
}`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "createEpisode": {
                "type": "Episode";
                "keyRaw": "createEpisode(input: $input)";
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
            "input": "CreateEpisodeInput";
        };
        "types": {
            "CreateEpisodeInput": {
                "scenarioId": "ID";
                "title": "String";
                "description": "String";
                "orderIndex": "Int";
            };
        };
        "defaults": {};
        "runtimeScalars": {};
    };
};