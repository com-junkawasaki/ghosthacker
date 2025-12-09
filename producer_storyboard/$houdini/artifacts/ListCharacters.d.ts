export type ListCharacters = {
    readonly "input": ListCharacters$input;
    readonly "result": ListCharacters$result | undefined;
};

export type ListCharacters$result = {
    readonly characters: ({
        readonly id: string;
        readonly projectId: string;
        readonly name: string;
        readonly description: string | null;
        readonly createdAt: string;
        readonly updatedAt: string;
    })[];
};

export type ListCharacters$input = {
    projectId: string | number;
};

export type ListCharacters$artifact = {
    "name": "ListCharacters";
    "kind": "HoudiniQuery";
    "hash": "d38ac547c06d838ba8a0aa7de6eed43bde37e3afdcba8e0ff6843114bdb9ac16";
    "raw": `query ListCharacters($projectId: ID!) {
  characters(projectId: $projectId) {
    id
    projectId
    name
    description
    createdAt
    updatedAt
  }
}`;
    "rootType": "Query";
    "stripVariables": [];
    "selection": {
        "fields": {
            "characters": {
                "type": "Character";
                "keyRaw": "characters(projectId: $projectId)";
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
                        "name": {
                            "type": "String";
                            "keyRaw": "name";
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