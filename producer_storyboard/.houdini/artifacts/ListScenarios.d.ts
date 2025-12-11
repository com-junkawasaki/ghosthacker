export type ListScenarios = {
    readonly "input": ListScenarios$input;
    readonly "result": ListScenarios$result | undefined;
};

export type ListScenarios$result = {
    readonly scenarios: ({
        readonly id: string;
        readonly projectId: string;
        readonly title: string;
        readonly description: string | null;
        readonly createdAt: string;
        readonly updatedAt: string;
    })[];
};

export type ListScenarios$input = {
    projectId: string | number;
};

export type ListScenarios$artifact = {
    "name": "ListScenarios";
    "kind": "HoudiniQuery";
    "hash": "8c70ac2df80dfc0bbf9637a2bec091d61fdb7637e2aed640a227bcfea49108d0";
    "raw": `query ListScenarios($projectId: ID!) {
  scenarios(projectId: $projectId) {
    id
    projectId
    title
    description
    createdAt
    updatedAt
  }
}`;
    "rootType": "Query";
    "stripVariables": [];
    "selection": {
        "fields": {
            "scenarios": {
                "type": "Scenario";
                "keyRaw": "scenarios(projectId: $projectId)";
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
            "projectId": "ID";
        };
        "types": {};
        "defaults": {};
        "runtimeScalars": {};
    };
    "policy": "CacheOrNetwork";
    "partial": false;
};