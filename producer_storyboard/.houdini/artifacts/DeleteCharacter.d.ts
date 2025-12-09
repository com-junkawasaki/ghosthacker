export type DeleteCharacter = {
    readonly "input": DeleteCharacter$input;
    readonly "result": DeleteCharacter$result;
};

export type DeleteCharacter$result = {
    readonly deleteCharacter: boolean;
};

export type DeleteCharacter$input = {
    id: string | number;
};

export type DeleteCharacter$optimistic = {
    readonly deleteCharacter?: boolean;
};

export type DeleteCharacter$artifact = {
    "name": "DeleteCharacter";
    "kind": "HoudiniMutation";
    "hash": "2bf60afe9425b1608482eee2ea5062f0faaedc65f0704dd738dbace8f770bd1d";
    "raw": `mutation DeleteCharacter($id: ID!) {
  deleteCharacter(id: $id)
}`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "deleteCharacter": {
                "type": "Boolean";
                "keyRaw": "deleteCharacter(id: $id)";
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
};