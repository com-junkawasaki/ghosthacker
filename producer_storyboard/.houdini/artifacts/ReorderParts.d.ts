export type ReorderParts = {
    readonly "input": ReorderParts$input;
    readonly "result": ReorderParts$result;
};

export type ReorderParts$result = {
    readonly reorderParts: ({
        readonly id: string;
        readonly episodeId: string;
        readonly title: string;
        readonly description: string | null;
        readonly orderIndex: number;
        readonly createdAt: string;
        readonly updatedAt: string;
    })[];
};

type ReorderPartsInput = {
    episodeId: string | number;
    partIds: (string | number)[];
};

export type ReorderParts$input = {
    input: ReorderPartsInput;
};

export type ReorderParts$optimistic = {
    readonly reorderParts?: ({
        readonly id?: string;
        readonly episodeId?: string;
        readonly title?: string;
        readonly description?: string | null;
        readonly orderIndex?: number;
        readonly createdAt?: string;
        readonly updatedAt?: string;
    })[];
};

export type ReorderParts$artifact = {
    "name": "ReorderParts";
    "kind": "HoudiniMutation";
    "hash": "9440211c23a594114166ec262d1781c71e93936c0dee7d508f7b9c212da57b7b";
    "raw": `mutation ReorderParts($input: ReorderPartsInput!) {
  reorderParts(input: $input) {
    id
    episodeId
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
            "reorderParts": {
                "type": "Part";
                "keyRaw": "reorderParts(input: $input)";
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
            "input": "ReorderPartsInput";
        };
        "types": {
            "ReorderPartsInput": {
                "episodeId": "ID";
                "partIds": "ID";
            };
        };
        "defaults": {};
        "runtimeScalars": {};
    };
};