export default {
    "name": "DeleteCharacterAsset",
    "kind": "HoudiniMutation",
    "hash": "61ee1d9e55ff0fc18fd0270a0cd5273cbf05aa495326fa9af590324bbdf1524f",

    "raw": `mutation DeleteCharacterAsset($assetId: ID!) {
  deleteCharacterAsset(assetId: $assetId)
}`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "deleteCharacterAsset": {
                "type": "Boolean",
                "keyRaw": "deleteCharacterAsset(assetId: $assetId)",
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
    }
};

"HoudiniHash=ec1c023f0c718dfd6fb98c26f77211b079597014b59a66ce9c9319352c357be1";