export type ReorderEpisodes = {
    readonly "input": ReorderEpisodes$input;
    readonly "result": ReorderEpisodes$result;
};

export type ReorderEpisodes$result = {
    readonly reorderEpisodes: ({
        readonly id: string;
        readonly scenarioId: string;
        readonly title: string;
        readonly description: string | null;
        readonly orderIndex: number;
        readonly createdAt: string;
        readonly updatedAt: string;
    })[];
};

type ReorderEpisodesInput = {
    scenarioId: string | number;
    episodeIds: (string | number)[];
};

export type ReorderEpisodes$input = {
    input: ReorderEpisodesInput;
};

export type ReorderEpisodes$optimistic = {
    readonly reorderEpisodes?: ({
        readonly id?: string;
        readonly scenarioId?: string;
        readonly title?: string;
        readonly description?: string | null;
        readonly orderIndex?: number;
        readonly createdAt?: string;
        readonly updatedAt?: string;
    })[];
};

export type ReorderEpisodes$artifact = {
    "name": "ReorderEpisodes";
    "kind": "HoudiniMutation";
    "hash": "a3284969f249a63a28cb7f0adaadec5205d98309ac3ca2858ae20082d4437d66";
    "raw": `mutation ReorderEpisodes($input: ReorderEpisodesInput!) {
  reorderEpisodes(input: $input) {
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
            "reorderEpisodes": {
                "type": "Episode";
                "keyRaw": "reorderEpisodes(input: $input)";
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
            "input": "ReorderEpisodesInput";
        };
        "types": {
            "ReorderEpisodesInput": {
                "scenarioId": "ID";
                "episodeIds": "ID";
            };
        };
        "defaults": {};
        "runtimeScalars": {};
    };
};