export type CreatePart = {
    readonly "input": CreatePart$input;
    readonly "result": CreatePart$result;
};

export type CreatePart$result = {
    readonly createPart: {
        readonly id: string;
        readonly episodeId: string;
        readonly title: string;
        readonly description: string | null;
        readonly orderIndex: number;
        readonly createdAt: string;
        readonly updatedAt: string;
    };
};

type CreatePartInput = {
    episodeId: string | number;
    title: string;
    description?: string | null | undefined;
    orderIndex?: number | null | undefined;
};

export type CreatePart$input = {
    input: CreatePartInput;
};

export type CreatePart$optimistic = {
    readonly createPart?: {
        readonly id?: string;
        readonly episodeId?: string;
        readonly title?: string;
        readonly description?: string | null;
        readonly orderIndex?: number;
        readonly createdAt?: string;
        readonly updatedAt?: string;
    };
};

export type CreatePart$artifact = {
    "name": "CreatePart";
    "kind": "HoudiniMutation";
    "hash": "1f146a5ca2a9d15f471f90094179ef4dbab7f5af8eaf3980976f95254fc07d15";
    "raw": `mutation CreatePart($input: CreatePartInput!) {
  createPart(input: $input) {
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
            "createPart": {
                "type": "Part";
                "keyRaw": "createPart(input: $input)";
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
            "input": "CreatePartInput";
        };
        "types": {
            "CreatePartInput": {
                "episodeId": "ID";
                "title": "String";
                "description": "String";
                "orderIndex": "Int";
            };
        };
        "defaults": {};
        "runtimeScalars": {};
    };
};