export type DeleteCharacterAsset = {
    readonly "input": DeleteCharacterAsset$input;
    readonly "result": DeleteCharacterAsset$result;
};

export type DeleteCharacterAsset$result = {
    readonly deleteCharacterAsset: boolean;
};

export type DeleteCharacterAsset$input = {
    assetId: string | number;
};

export type DeleteCharacterAsset$optimistic = {
    readonly deleteCharacterAsset?: boolean;
};

export type DeleteCharacterAsset$artifact = {
    "name": "DeleteCharacterAsset";
    "kind": "HoudiniMutation";
    "hash": "61ee1d9e55ff0fc18fd0270a0cd5273cbf05aa495326fa9af590324bbdf1524f";
    "raw": `mutation DeleteCharacterAsset($assetId: ID!) {
  deleteCharacterAsset(assetId: $assetId)
}`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "deleteCharacterAsset": {
                "type": "Boolean";
                "keyRaw": "deleteCharacterAsset(assetId: $assetId)";
                "visible": true;
            };
        };
    };
    "pluginData": {
        "houdini-svelte": {};
    };
    "input": {
        "fields": {
            "assetId": "ID";
        };
        "types": {};
        "defaults": {};
        "runtimeScalars": {};
    };
};