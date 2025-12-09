export default {
    "name": "ListCharacterAssets",
    "kind": "HoudiniQuery",
    "hash": "cb191bd56a1268cff060d81aa32b04d34781f5fcff53c0decba529e02351974e",

    "raw": `query ListCharacterAssets($characterId: ID!) {
  characterAssets(characterId: $characterId) {
    id
    characterId
    assetType
    assetFormat
    createdAt
    updatedAt
  }
}`,

    "rootType": "Query",
    "stripVariables": [],

    "selection": {
        "fields": {
            "characterAssets": {
                "type": "CharacterAsset",
                "keyRaw": "characterAssets(characterId: $characterId)",

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
            "characterId": "ID"
        },

        "types": {},
        "defaults": {},
        "runtimeScalars": {}
    },

    "policy": "CacheOrNetwork",
    "partial": false
};

"HoudiniHash=370eb2bf6dcc6e3d4f65dd51a0205ef8b736377bba81103d18f3520977234bef";