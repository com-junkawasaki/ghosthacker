export type GetCharacterAssetData = {
    readonly "input": GetCharacterAssetData$input;
    readonly "result": GetCharacterAssetData$result | undefined;
};

export type GetCharacterAssetData$result = {
    readonly characterAssetData: string;
};

export type GetCharacterAssetData$input = {
    assetId: string | number;
};

export type GetCharacterAssetData$artifact = {
    "name": "GetCharacterAssetData";
    "kind": "HoudiniQuery";
    "hash": "ed41ca15bcf1006db78052afebe02ceee38497470da82bca34339060ed8d062c";
    "raw": `query GetCharacterAssetData($assetId: ID!) {
  characterAssetData(assetId: $assetId)
}`;
    "rootType": "Query";
    "stripVariables": [];
    "selection": {
        "fields": {
            "characterAssetData": {
                "type": "String";
                "keyRaw": "characterAssetData(assetId: $assetId)";
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
    "policy": "CacheOrNetwork";
    "partial": false;
};