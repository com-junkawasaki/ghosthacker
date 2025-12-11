export type UpdateScenario = {
    readonly "input": UpdateScenario$input;
    readonly "result": UpdateScenario$result;
};

export type UpdateScenario$result = {
    readonly updateScenario: {
        readonly id: string;
        readonly projectId: string;
        readonly title: string;
        readonly description: string | null;
        readonly createdAt: string;
        readonly updatedAt: string;
    };
};

type UpdateScenarioInput = {
    id: string | number;
    title?: string | null | undefined;
    description?: string | null | undefined;
};

export type UpdateScenario$input = {
    input: UpdateScenarioInput;
};

export type UpdateScenario$optimistic = {
    readonly updateScenario?: {
        readonly id?: string;
        readonly projectId?: string;
        readonly title?: string;
        readonly description?: string | null;
        readonly createdAt?: string;
        readonly updatedAt?: string;
    };
};

export type UpdateScenario$artifact = {
    "name": "UpdateScenario";
    "kind": "HoudiniMutation";
    "hash": "0fc5d71efd8e66b28caa3f59690de6f39416b3f3db50026587e0858f9cdd77a9";
    "raw": `mutation UpdateScenario($input: UpdateScenarioInput!) {
  updateScenario(input: $input) {
    id
    projectId
    title
    description
    createdAt
    updatedAt
  }
}`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "updateScenario": {
                "type": "Scenario";
                "keyRaw": "updateScenario(input: $input)";
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
            "input": "UpdateScenarioInput";
        };
        "types": {
            "UpdateScenarioInput": {
                "id": "ID";
                "title": "String";
                "description": "String";
            };
        };
        "defaults": {};
        "runtimeScalars": {};
    };
};