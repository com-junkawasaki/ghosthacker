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

"HoudiniHash=1f61829e5d943402f91fc25e57974dceaa793ef0b866b4a3e179739417844f22";