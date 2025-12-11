export type CreateScenePlan = {
    readonly "input": CreateScenePlan$input;
    readonly "result": CreateScenePlan$result;
};

export type CreateScenePlan$result = {
    readonly createScenePlan: {
        readonly id: string;
        readonly partId: string;
        readonly description: string;
        readonly orderIndex: number;
        readonly createdAt: string;
        readonly updatedAt: string;
    };
};

type CreateScenePlanInput = {
    partId: string | number;
    description: string;
    orderIndex?: number | null | undefined;
};

export type CreateScenePlan$input = {
    input: CreateScenePlanInput;
};

export type CreateScenePlan$optimistic = {
    readonly createScenePlan?: {
        readonly id?: string;
        readonly partId?: string;
        readonly description?: string;
        readonly orderIndex?: number;
        readonly createdAt?: string;
        readonly updatedAt?: string;
    };
};

export type CreateScenePlan$artifact = {
    "name": "CreateScenePlan";
    "kind": "HoudiniMutation";
    "hash": "74869d18c5f62fa10773a68923a39907ed60fefa68d999ce8bd92184f54b4e73";
    "raw": `mutation CreateScenePlan($input: CreateScenePlanInput!) {
  createScenePlan(input: $input) {
    id
    partId
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
            "createScenePlan": {
                "type": "ScenePlan";
                "keyRaw": "createScenePlan(input: $input)";
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
    "pluginData": {
        "houdini-svelte": {};
    };
    "input": {
        "fields": {
            "input": "CreateScenePlanInput";
        };
        "types": {
            "CreateScenePlanInput": {
                "partId": "ID";
                "description": "String";
                "orderIndex": "Int";
            };
        };
        "defaults": {};
        "runtimeScalars": {};
    };
};