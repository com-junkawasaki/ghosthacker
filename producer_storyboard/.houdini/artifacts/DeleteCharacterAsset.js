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

"HoudiniHash=8fd5787948c353dac9a57523043af0df54e069469b72845153da7e99ae2707ab";