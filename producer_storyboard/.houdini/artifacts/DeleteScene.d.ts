export type DeleteScene = {
    readonly "input": DeleteScene$input;
    readonly "result": DeleteScene$result;
};

export type DeleteScene$result = {
    readonly deleteScene: boolean;
};

export type DeleteScene$input = {
    id: string | number;
};

export type DeleteScene$optimistic = {
    readonly deleteScene?: boolean;
};

export type DeleteScene$artifact = {
    "name": "DeleteScene";
    "kind": "HoudiniMutation";
    "hash": "7421a2eec5fbf6e2d29ca918aa010c47febdac17d9648ca0cfb2ac66351b33d6";
    "raw": `mutation DeleteScene($id: ID!) {
  deleteScene(id: $id)
}`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "deleteScene": {
                "type": "Boolean";
                "keyRaw": "deleteScene(id: $id)";
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