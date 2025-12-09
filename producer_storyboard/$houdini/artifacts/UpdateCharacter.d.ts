export type UpdateCharacter = {
    readonly "input": UpdateCharacter$input;
    readonly "result": UpdateCharacter$result;
};

export type UpdateCharacter$result = {
    readonly updateCharacter: {
        readonly id: string;
        readonly projectId: string;
        readonly name: string;
        readonly description: string | null;
        readonly createdAt: string;
        readonly updatedAt: string;
    };
};

type UpdateCharacterInput = {
    id: string | number;
    name?: string | null | undefined;
    description?: string | null | undefined;
};

export type UpdateCharacter$input = {
    input: UpdateCharacterInput;
};

export type UpdateCharacter$optimistic = {
    readonly updateCharacter?: {
        readonly id?: string;
        readonly projectId?: string;
        readonly name?: string;
        readonly description?: string | null;
        readonly createdAt?: string;
        readonly updatedAt?: string;
    };
};

export type UpdateCharacter$artifact = {
    "name": "UpdateCharacter";
    "kind": "HoudiniMutation";
    "hash": "b75484c2ba413e190bf21daaddd3fc72f79d2efb40cb7f7f258bb935e685f798";
    "raw": `mutation UpdateCharacter($input: UpdateCharacterInput!) {
  updateCharacter(input: $input) {
    id
    projectId
    name
    description
    createdAt
    updatedAt
  }
}`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "updateCharacter": {
                "type": "Character";
                "keyRaw": "updateCharacter(input: $input)";
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
            "input": "UpdateCharacterInput";
        };
        "types": {
            "UpdateCharacterInput": {
                "id": "ID";
                "name": "String";
                "description": "String";
            };
        };
        "defaults": {};
        "runtimeScalars": {};
    };
};