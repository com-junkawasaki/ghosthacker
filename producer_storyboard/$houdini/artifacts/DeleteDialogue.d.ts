export type DeleteDialogue = {
    readonly "input": DeleteDialogue$input;
    readonly "result": DeleteDialogue$result;
};

export type DeleteDialogue$result = {
    readonly deleteDialogue: boolean;
};

export type DeleteDialogue$input = {
    id: string | number;
};

export type DeleteDialogue$optimistic = {
    readonly deleteDialogue?: boolean;
};

export type DeleteDialogue$artifact = {
    "name": "DeleteDialogue";
    "kind": "HoudiniMutation";
    "hash": "4f0d63dd47fd766e95aade6ccf67f8f6cca81f6e293f1bab8e324e002f15f918";
    "raw": `mutation DeleteDialogue($id: ID!) {
  deleteDialogue(id: $id)
}`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "deleteDialogue": {
                "type": "Boolean";
                "keyRaw": "deleteDialogue(id: $id)";
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