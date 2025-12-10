export default {
    "name": "GetCharacterAssetData",
    "kind": "HoudiniQuery",
    "hash": "ed41ca15bcf1006db78052afebe02ceee38497470da82bca34339060ed8d062c",

    "raw": `query GetCharacterAssetData($assetId: ID!) {
  characterAssetData(assetId: $assetId)
}`,

    "rootType": "Query",
    "stripVariables": [],

    "selection": {
        "fields": {
            "characterAssetData": {
                "type": "String",
                "keyRaw": "characterAssetData(assetId: $assetId)",
                "visible": true
            }
        }
    },

    "pluginData": {
        "houdini-svelte": {}
    },

    "input": {
        "fields": {
            "assetId": "ID"
        },

        "types": {},
        "defaults": {},
        "runtimeScalars": {}
    },

    "policy": "CacheOrNetwork",
    "partial": false
};

"HoudiniHash=324e76cd2000e2d5da7e91aee7913d2b9577a50bc999df4033a4c524d5977dcd";