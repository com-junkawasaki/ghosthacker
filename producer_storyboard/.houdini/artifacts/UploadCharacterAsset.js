export default {
    "name": "UploadCharacterAsset",
    "kind": "HoudiniMutation",
    "hash": "d779411495022e161b7a66e36ee79fd72fb2e28a2dccc9a49bdd800691989e62",

    "raw": `mutation UploadCharacterAsset($input: UploadCharacterAssetInput!) {
  uploadCharacterAsset(input: $input) {
    id
    characterId
    assetType
    assetFormat
    createdAt
    updatedAt
  }
}`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "uploadCharacterAsset": {
                "type": "CharacterAsset",
                "keyRaw": "uploadCharacterAsset(input: $input)",

                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID",
                            "keyRaw": "id",
                            "visible": true
                        },

                        "characterId": {
                            "type": "ID",
                            "keyRaw": "characterId",
                            "visible": true
                        },

                        "assetType": {
                            "type": "String",
                            "keyRaw": "assetType",
                            "visible": true
                        },

                        "assetFormat": {
                            "type": "String",
                            "keyRaw": "assetFormat",
                            "nullable": true,
                            "visible": true
                        },

                        "createdAt": {
                            "type": "String",
                            "keyRaw": "createdAt",
                            "visible": true
                        },

                        "updatedAt": {
                            "type": "String",
                            "keyRaw": "updatedAt",
                            "visible": true
                        }
                    }
                },

                "visible": true
            }
        }
    },

    "pluginData": {
        "houdini-svelte": {}
    },

    "input": {
        "fields": {
            "input": "UploadCharacterAssetInput"
        },

        "types": {
            "UploadCharacterAssetInput": {
                "characterId": "ID",
                "assetData": "String",
                "assetType": "String",
                "assetFormat": "String"
            }
        },

        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=33242fc6de0c69fa7ce1a193dff84664cade4caec96139af0f6ed6f8c1e805ca";